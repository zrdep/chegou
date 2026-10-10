// tudo que aparece no terminal depois que o chegou abre: banner, atividade e despedida

import { homedir } from 'node:os'
import pc from 'picocolors'
import { REPO_URL } from '../config.js'
import { t, timeLocale } from '../i18n/index.js'
import { renderQR } from './qr.js'

// o cmd antigo do Windows (conhost) não tem fonte pra alguns símbolos
// Windows Terminal e VS Code definem essas variáveis, e aí dá pra caprichar
const modern =
  process.platform !== 'win32' || Boolean(process.env.WT_SESSION || process.env.TERM_PROGRAM)

export const sym = modern
  ? { ok: '✓', dot: '●', warn: '▲', tl: '╭', tr: '╮', bl: '╰', br: '╯', h: '─', v: '│' }
  : { ok: '√', dot: '•', warn: '!', tl: '┌', tr: '┐', bl: '└', br: '┘', h: '─', v: '│' }

const stats = { files: 0, bytes: 0 }

// ---------- utilitários ----------

/** tamanho visível do texto, ignorando os códigos de cor */
function visibleLength(text) {
  return text.replace(/\x1b\[[0-9;]*m/g, '').length
}

/** completa com espaços até a largura, contando só o que aparece na tela */
function pad(text, width) {
  return text + ' '.repeat(Math.max(0, width - visibleLength(text)))
}

/**
 * 2400000 -> "2.3 MB"
 * @param {number} bytes
 */
export function formatSize(bytes) {
  const units = ['B', 'KB', 'MB', 'GB']
  let size = bytes
  let unit = 0

  while (size >= 1024 && unit < units.length - 1) {
    size /= 1024
    unit++
  }

  return `${unit === 0 ? size : size.toFixed(1)} ${units[unit]}`
}

/** 10 -> "10 min", 0.5 -> "30 s", 90 -> "1 h 30 min" */
export function formatMinutes(minutes) {
  if (minutes < 1) return `${Math.round(minutes * 60)} s`
  if (minutes < 60) return `${+minutes.toFixed(1)} min`
  const h = Math.floor(minutes / 60)
  const m = Math.round(minutes % 60)
  return m ? `${h} h ${m} min` : `${h} h`
}

/** C:\Users\Pedro\Downloads\chegou -> ~\Downloads\chegou (só pra exibir) */
function prettyPath(path) {
  const home = homedir()
  return path.startsWith(home) ? `~${path.slice(home.length)}` : path
}

/** hora atual no formato do idioma: 16:20 / 4:20 PM */
function now() {
  return new Date().toLocaleTimeString(timeLocale(), { hour: '2-digit', minute: '2-digit' })
}

/** corta nomes longos: "um nome bem grande demais…" */
function shorten(text, max = 36) {
  return text.length > max ? `${text.slice(0, max - 1)}…` : text
}

/** linha de atividade alinhada:  ✓ 16:20  foto.jpg ············ 2.3 MB */
function activityLine(icon, name, sizeText, suffix = '', sizeColor = pc.cyan) {
  const shown = shorten(name)
  const dots = '·'.repeat(Math.max(2, 48 - shown.length - sizeText.length))
  console.log(`  ${icon} ${pc.dim(now())}  ${shown} ${pc.dim(dots)} ${sizeColor(sizeText)}${suffix ? ` ${pc.dim(suffix)}` : ''}`)
}

// ---------- moldura ----------

/** desenha uma caixa em volta das linhas, com título na borda de cima */
function box(lines, title) {
  const inner = Math.max(...lines.map(visibleLength)) + 6
  const label = ` ${title} `
  const top = sym.tl + sym.h.repeat(2) + label + sym.h.repeat(inner - label.length - 2) + sym.tr
  const empty = sym.v + ' '.repeat(inner) + sym.v

  return [
    pc.dim(top),
    pc.dim(empty),
    ...lines.map((line) => pc.dim(sym.v) + '   ' + pad(line, inner - 3) + pc.dim(sym.v)),
    pc.dim(empty),
    pc.dim(sym.bl + sym.h.repeat(inner) + sym.br),
  ]
    .map((line) => `  ${line}`)
    .join('\n')
}

/** QR à esquerda e informações à direita, centralizadas na altura */
function sideBySide(qr, info) {
  const qrWidth = Math.max(...qr.map(visibleLength))
  const height = Math.max(qr.length, info.length)
  const offset = Math.floor((height - info.length) / 2)

  return Array.from({ length: height }, (_, i) => `${pad(qr[i] ?? '', qrWidth)}    ${info[i - offset] ?? ''}`)
}

// ---------- telas ----------

/**
 * banner de abertura com o QR
 * @param {{ ip: string | null, port: number, preferredPort: number, dir: string, token: string, version: string, timeout?: number, relayUrl?: string | null }} info
 */
export function printBanner({ ip, port, preferredPort, dir, token, version, timeout = 0, relayUrl = null }) {
  const localUrl = `http://localhost:${port}`
  const networkUrl = ip ? `http://${ip}:${port}` : null

  // rótulos alinhados pela maior palavra do idioma
  const rows = []
  if (relayUrl) rows.push([t('banner.tunnel'), pc.bold(pc.cyan(relayUrl.replace('https://', '')))])
  rows.push(
    [t('banner.network'), networkUrl ? (relayUrl ? pc.dim(networkUrl) : pc.bold(pc.cyan(networkUrl))) : pc.yellow(t('banner.noNetwork'))],
    [t('banner.local'), pc.dim(localUrl)],
    [t('banner.folder'), prettyPath(dir)],
    [t('banner.token'), pc.yellow(token)],
  )
  if (timeout) rows.push([t('banner.shutsDown'), t('banner.idleFor', { time: formatMinutes(timeout) })])

  const labelWidth = Math.max(...rows.map(([label]) => label.length)) + 2

  const info = [
    `${pc.green(sym.dot)} ${pc.bold('chegou')}${relayUrl ? ` ${pc.cyan(t('banner.tunnelTag'))}` : ''}`,
    pc.dim(t('banner.waiting')),
    '',
    ...rows.map(([label, value]) => `${pc.dim(label.padEnd(labelWidth))}${value}`),
  ]

  if (relayUrl) info.push('', pc.yellow(`${sym.warn} ${t('banner.tunnelLimit')}`))
  if (port !== preferredPort) info.push('', pc.yellow(`${sym.warn} ${t('banner.portBusy', { wanted: preferredPort, port })}`))

  info.push(
    '',
    pc.dim(relayUrl ? t('banner.scanTunnel') : networkUrl ? t('banner.scan') : t('banner.connect')),
    pc.dim(t('banner.drop')),
    pc.dim(t('banner.quit')),
  )

  let lines = info
  const targetUrl = relayUrl || networkUrl

  if (targetUrl) {
    const qr = renderQR(`${targetUrl}/?t=${token}`)
    const combined = sideBySide(qr, info)
    const width = Math.max(...combined.map(visibleLength)) + 12
    const columns = process.stdout.columns ?? 80

    // terminal estreito: QR em cima, informações embaixo
    lines = width <= columns ? combined : [...qr, '', ...info]
  }

  console.log()
  console.log(box(lines, `chegou v${version}${relayUrl ? ` ${t('banner.tunnelTag')}` : ''}`))
  console.log()
  console.log(pc.dim(`  ${sym.h.repeat(2)} ${t('banner.activity')} ${sym.h.repeat(40)}`))
  console.log()
}

/** arquivo que chegou do celular */
export function printFile({ name, size }) {
  stats.files++
  stats.bytes += size
  activityLine(pc.green(sym.ok), name, formatSize(size))
}

/** item que o PC compartilhou com o celular */
export function printShared(item) {
  if (item.type === 'file' || item.name) {
    activityLine(pc.cyan('↑'), item.name, formatSize(item.size ?? 0), t('activity.shared'))
  } else {
    console.log(`  ${pc.cyan('↑')} ${pc.dim(now())}  ${shorten(item.content ?? '')} ${pc.dim(t('activity.sharedText'))}`)
  }
}

/** arquivo do PC baixado pelo celular */
export function printDownloaded({ name, size }) {
  activityLine(pc.green('↓'), name, formatSize(size), t('activity.downloaded'), pc.green)
}

/** aviso amarelo (pasta ignorada, túnel caiu...) */
export function printWarning(message) {
  console.log(`  ${pc.yellow('!')} ${message}`)
}

/** aviso de versão nova no npm */
export function printUpdate({ current, latest, command }) {
  console.log(`  ${pc.yellow('↑')} ${t('update.available')} ${pc.dim(current)} ${pc.dim('→')} ${pc.green(latest)}`)
  console.log(`    ${pc.dim(t('update.run'))} ${pc.cyan(command)}\n`)
}

/** erro vermelho no meio do uso */
export function printError(message) {
  console.log(`  ${pc.red('!')} ${message}`)
}

/**
 * resumo ao sair
 * @param {{ reason?: 'ctrl+c' | 'timeout', minutes?: number }} info
 */
export function printGoodbye({ reason = 'ctrl+c', minutes = 0 } = {}) {
  const summary =
    stats.files === 0
      ? t('goodbye.nothing')
      : `${t('goodbye.files', { n: stats.files })} · ${formatSize(stats.bytes)}`

  if (reason === 'timeout') {
    console.log(`\n  ${pc.yellow(sym.warn)} ${pc.dim(t('goodbye.idle', { time: formatMinutes(minutes) }))}`)
  }

  console.log(`\n  ${pc.dim(t('goodbye.bye'))} ${summary}`)

  // pedido de estrela: só quando a pessoa fechou (não no desligamento automático)
  if (reason !== 'timeout') {
    console.log(`\n  ${pc.dim(t('goodbye.star'))} ${pc.yellow('★')} ${pc.dim('→')} ${pc.cyan(REPO_URL)}`)
  }

  console.log()
}
