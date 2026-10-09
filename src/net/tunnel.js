import { existsSync, readdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { startTunnel } from 'untun'
import { t } from '../i18n/index.js'

// o untun guarda o cloudflared aqui depois de baixar
const CLOUDFLARED_DIR = join(tmpdir(), 'node-untun')

/**
 * o binário do cloudflared já foi baixado alguma vez?
 * @returns {boolean}
 */
function hasCloudflared() {
  try {
    return existsSync(CLOUDFLARED_DIR) && readdirSync(CLOUDFLARED_DIR).some((f) => f.startsWith('cloudflared'))
  } catch {
    return false
  }
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
  onStatus(firstRun ? t('tunnel.downloading') : t('tunnel.opening'))

  // o untun escreve logs em inglês no console; silencia pra manter o terminal limpo
  const originalLog = console.log
  console.log = () => {}

  let tunnel
  try {
    tunnel = await withTimeout(
      startTunnel({ port, hostname: '127.0.0.1', acceptCloudflareNotice: true }),
      firstRun ? 180_000 : 30_000,
      t('tunnel.slow'),
    )
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
    throw err
  } finally {
    console.log = originalLog
  }
}
