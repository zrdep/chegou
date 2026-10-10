// avisa quando tem versão nova do chegou no npm
// nunca atrasa nem quebra o programa: sem internet ou com erro, simplesmente não avisa

import { readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const REGISTRY_URL = 'https://registry.npmjs.org/chegou/latest'
const CACHE_FILE = join(tmpdir(), 'chegou-update.json')
const CHECK_EVERY_MS = 24 * 60 * 60 * 1000 // consulta o npm no máximo 1x por dia
const TIMEOUT_MS = 2500

/** "1.10.0" > "1.9.2"? compara número por número (ignora sufixos tipo -beta) */
export function isNewer(latest, current) {
  const a = String(latest).split('-')[0].split('.').map(Number)
  const b = String(current).split('-')[0].split('.').map(Number)
  for (let i = 0; i < 3; i++) {
    if ((a[i] || 0) !== (b[i] || 0)) return (a[i] || 0) > (b[i] || 0)
  }
  return false
}

/** rodando via npx? aí o comando certo pra atualizar é outro */
export function isNpx() {
  return process.env.npm_command === 'exec' || /[\\/]_npx[\\/]/.test(process.argv[1] ?? '')
}

function shouldSkip() {
  const env = process.env
  return Boolean(env.CI || env.NO_UPDATE_NOTIFIER || env.CHEGOU_NO_UPDATE_CHECK || !process.stdout.isTTY)
}

function readCache() {
  try {
    return JSON.parse(readFileSync(CACHE_FILE, 'utf8'))
  } catch {
    return null
  }
}

function writeCache(latest) {
  try {
    writeFileSync(CACHE_FILE, JSON.stringify({ latest, checkedAt: Date.now() }))
  } catch {}
}

async function fetchLatest() {
  const res = await fetch(REGISTRY_URL, {
    signal: AbortSignal.timeout(TIMEOUT_MS),
    headers: { accept: 'application/json' },
  })
  if (!res.ok) throw new Error(`npm ${res.status}`)
  const { version } = await res.json()
  return version
}

/**
 * descobre se tem versão nova
 * @param {string} current versão rodando agora
 * @returns {Promise<{ current: string, latest: string, command: string } | null>}
 */
export async function checkForUpdate(current) {
  if (shouldSkip()) return null

  try {
    const cache = readCache()
    let latest = cache?.latest

    if (!latest || Date.now() - (cache.checkedAt ?? 0) > CHECK_EVERY_MS) {
      latest = await fetchLatest()
      writeCache(latest)
    }

    if (!latest || !isNewer(latest, current)) return null
    const command = isNpx() ? 'npx chegou@latest' : 'npm install -g chegou@latest'
    return { current, latest, command }
  } catch {
    return null
  }
}
