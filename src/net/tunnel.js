import { readFileSync, rmSync, statSync } from 'node:fs'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import pc from 'picocolors'
import { startTunnel } from 'untun'
import { t } from '../i18n/index.js'

// o cloudflared de verdade tem dezenas de MB; menos que isso é download pela metade
const MIN_BINARY_BYTES = 5 * 1024 * 1024

/**
 * versão do cloudflared que o untun usa (ele procura exatamente esse arquivo).
 * ela fica escrita dentro do untun; se mudar de lugar numa versão nova, devolve null
 * @returns {string | null}
 */
function cloudflaredVersion() {
  if (process.env.CLOUDFLARED_VERSION) return process.env.CLOUDFLARED_VERSION
  try {
    const require = createRequire(import.meta.url)
    const dist = dirname(require.resolve('untun'))
    const source = readFileSync(join(dist, '_chunks', 'cloudflared.mjs'), 'utf8')
    return source.match(/CLOUDFLARED_VERSION\s*\|\|\s*"([^"]+)"/)?.[1] ?? null
  } catch {
    return null
  }
}

/** o mesmo caminho que o untun usa pro binário (sem versão conhecida: null) */
function cloudflaredPath() {
  const version = cloudflaredVersion()
  if (!version) return null
  const name = process.platform === 'win32' ? `cloudflared.${version}.exe` : `cloudflared.${version}`
  return join(tmpdir(), 'node-untun', name)
}

/**
 * o cloudflared desta versão já está baixado e inteiro?
 * um arquivo pequeno demais é download interrompido: apaga, senão o untun
 * acharia que está instalado e o túnel falharia pra sempre
 * @returns {boolean}
 */
function hasCloudflared() {
  const path = cloudflaredPath()
  if (!path) return false
  try {
    if (statSync(path).size >= MIN_BINARY_BYTES) return true
    rmSync(path, { force: true })
  } catch {
    // não existe ainda
  }
  return false
}

/** apaga um download que começou nesta execução e não terminou */
function removePartialDownload() {
  const path = cloudflaredPath()
  if (!path) return
  try {
    if (statSync(path).size < MIN_BINARY_BYTES) rmSync(path, { force: true })
  } catch {}
}

/**
 * rejeita se a promise demorar mais que `ms`
 * @template T
 * @param {Promise<T>} promise
 * @param {number} ms
 * @param {string} message
 * @returns {Promise<T>}
 */
function withTimeout(promise, ms, message) {
  let timer
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(message)), ms)
  })
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer))
}

/**
 * espera a url pública responder: logo depois de criado, o endereço
 * do quick tunnel pode levar alguns segundos pra existir no DNS
 * @param {string} url
 * @param {number} ms
 */
async function waitUntilReachable(url, ms) {
  const deadline = Date.now() + ms
  while (Date.now() < deadline) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(4000) })
      if (res.ok) return true
    } catch {
      // ainda não propagou, tenta de novo
    }
    await new Promise((r) => setTimeout(r, 1000))
  }
  return false
}

/**
 * abre um túnel público (Cloudflare Quick Tunnel) apontando pro servidor local
 * @param {number} port porta local do servidor
 * @param {{ onStatus?: (message: string) => void }} options
 * @returns {Promise<{ url: string, close: () => Promise<void> }>}
 */
export async function openTunnel(port, { onStatus = () => {} } = {}) {
  const firstRun = !hasCloudflared()

  // na primeira vez o cloudflared é baixado do GitHub da Cloudflare: avisa dos termos
  if (firstRun) process.stdout.write(`\r\x1b[2K  ${pc.dim(t('tunnel.notice'))}\n`)
  onStatus(firstRun ? t('tunnel.downloading') : t('tunnel.opening'))

  // o untun escreve logs em inglês no console; silencia pra manter o terminal limpo
  const originalLog = console.log
  console.log = () => {}

  let tunnel
  const starting = startTunnel({ port, hostname: '127.0.0.1', acceptCloudflareNotice: true })
  try {
    tunnel = await withTimeout(starting, firstRun ? 180_000 : 30_000, t('tunnel.slow'))
    if (!tunnel) throw new Error(t('tunnel.failed'))

    const url = await withTimeout(Promise.resolve(tunnel.getURL()), 30_000, t('tunnel.noUrl'))
    if (!url) throw new Error(t('tunnel.noUrl'))

    console.log = originalLog
    onStatus(t('tunnel.waiting'))
    await waitUntilReachable(url, 20_000)

    return {
      url,
      close: async () => {
        try {
          await tunnel.close()
        } catch {
          // já estava fechado
        }
      },
    }
  } catch (err) {
    await tunnel?.close().catch(() => {})
    // se o tempo estourou, o túnel ainda pode abrir depois: fecha quando abrir
    starting.then((late) => late?.close()).catch(() => {})
    if (firstRun) removePartialDownload()
    throw err
  } finally {
    console.log = originalLog
  }
}
