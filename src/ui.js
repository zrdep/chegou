import { homedir } from 'node:os'
import pc from 'picocolors'
import { renderQR } from './qr.js'

// o cmd antigo do Windows (conhost) não tem fonte pra alguns símbolos
// Windows Terminal e VS Code definem essas variáveis, e aí dá pra caprichar
const modern =
  process.platform !== 'win32' || Boolean(process.env.WT_SESSION || process.env.TERM_PROGRAM)

const sym = modern
  ? { ok: '✓', dot: '●', warn: '▲', tl: '╭', tr: '╮', bl: '╰', br: '╯', h: '─', v: '│' }
  : { ok: '√', dot: '•', warn: '!', tl: '┌', tr: '┐', bl: '└', br: '┘', h: '─', v: '│' }

const stats = { files: 0, bytes: 0 }

/**
 * tamanho visível do texto, ignorando os códigos de cor
 * @param {string} text
 * @returns {number}
 */
function visibleLength(text) {
  return text.replace(/\x1b\[[0-9;]*m/g, '').length
}

/**
 * completa com espaços até a largura, contando só o que aparece na tela
 * @param {string} text
 * @param {number} width
 * @returns {string}
 */
function pad(text, width) {
  return text + ' '.repeat(Math.max(0, width - visibleLength(text)))
}

/**
 * 2400000 -> "2.3 MB"
 * @param {number} bytes
 * @returns {string}
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

/**
 * C:\Users\Pedro\Downloads\chegou -> ~\Downloads\chegou (só pra exibir)
 * @param {string} path
 * @returns {string}
 */
function prettyPath(path) {
  const home = homedir()
  return path.startsWith(home) ? `~${path.slice(home.length)}` : path
}

/**
 * desenha uma caixa em volta das linhas, com título na borda de cima
 * @param {string[]} lines
 * @param {string} title
 * @returns {string}
 */
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

/**
 * coloca o QR à esquerda e as informações à direita, centralizadas na altura
 * @param {string[]} qr
 * @param {string[]} info
 * @returns {string[]}
 */
function sideBySide(qr, info) {
  const qrWidth = Math.max(...qr.map(visibleLength))
  const height = Math.max(qr.length, info.length)
  const offset = Math.floor((height - info.length) / 2)

  return Array.from({ length: height }, (_, i) => {
    const left = pad(qr[i] ?? '', qrWidth)
    const right = info[i - offset] ?? ''
    return `${left}    ${right}`
  })
}

/**
 * imprime o banner de abertura
 * @param {{ ip: string | null, port: number, preferredPort: number, dir: string, token: string, version: string, timeout?: number }} info
 */
export function printBanner({ ip, port, preferredPort, dir, token, version, timeout = 0 }) {
  const localUrl = `http://localhost:${port}`
  const networkUrl = ip ? `http://${ip}:${port}` : null

  const info = [
    `${pc.green(sym.dot)} ${pc.bold('chegou')}`,
    pc.dim('esperando arquivos'),
    '',
    `${pc.dim('rede ')}   ${networkUrl ? pc.bold(pc.cyan(networkUrl)) : pc.yellow('sem wi-fi/cabo')}`,
    `${pc.dim('local')}   ${pc.cyan(localUrl)}`,
    `${pc.dim('pasta')}   ${prettyPath(dir)}`,
    `${pc.dim('token')}   ${pc.yellow(token)}`,
  ]

  if (timeout) {
    info.push(`${pc.dim('desliga')} ${formatMinutes(timeout)} sem uso`)
  }

  if (port !== preferredPort) {
    info.push('', pc.yellow(`${sym.warn} porta ${preferredPort} ocupada, usando ${port}`))
  }

  info.push(
    '',
    pc.dim(networkUrl ? 'escaneie o QR com o celular' : 'conecte o PC na rede pra usar no celular'),
    pc.dim('arraste arquivos aqui ou digite link + Enter'),
    pc.dim('ctrl+c para sair'),
  )

  let lines = info

  if (networkUrl) {
    const qr = renderQR(`${networkUrl}/?t=${token}`)
    const combined = sideBySide(qr, info)
    const width = Math.max(...combined.map(visibleLength)) + 12
    const columns = process.stdout.columns ?? 80

    // terminal estreito: QR em cima, informações embaixo
    lines = width <= columns ? combined : [...qr, '', ...info]
  }

  console.log()
  console.log(box(lines, `chegou v${version}`))
  console.log()
  console.log(pc.dim(`  ${sym.h.repeat(2)} atividade ${sym.h.repeat(40)}`))
  console.log()
}

/**
 * imprime cada arquivo que chegou, alinhado:
 *   ✓ 16:20  foto.jpg ··················· 2.3 MB
 * @param {{ name: string, size: number }} file
 */
export function printFile({ name, size }) {
  stats.files++
  stats.bytes += size

  const time = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  const shown = name.length > 36 ? `${name.slice(0, 35)}…` : name
  const sizeText = formatSize(size)
  const dots = '·'.repeat(Math.max(2, 48 - shown.length - sizeText.length))

  console.log(`  ${pc.green(sym.ok)} ${pc.dim(time)}  ${shown} ${pc.dim(dots)} ${pc.cyan(sizeText)}`)
}

/**
 * imprime item compartilhado pelo PC com o celular
 * @param {{ name?: string, size?: number, content?: string, type?: 'file' | 'text' }} item
 */
export function printShared(item) {
  const time = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  if (item.type === 'file' || item.name) {
    const shown = item.name.length > 36 ? `${item.name.slice(0, 35)}…` : item.name
    const sizeText = formatSize(item.size ?? 0)
    const dots = '·'.repeat(Math.max(2, 48 - shown.length - sizeText.length))
    console.log(`  ${pc.cyan('↑')} ${pc.dim(time)}  ${shown} ${pc.dim(dots)} ${pc.cyan(sizeText)} ${pc.dim('(compartilhado)')}`)
  } else {
    const text = item.content ?? ''
    const shown = text.length > 36 ? `${text.slice(0, 35)}…` : text
    console.log(`  ${pc.cyan('↑')} ${pc.dim(time)}  ${shown} ${pc.dim('···· compartilhado com celular')}`)
  }
}

/**
 * imprime arquivo baixado pelo celular
 * @param {{ name: string, size: number }} file
 */
export function printDownloaded({ name, size }) {
  const time = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  const shown = name.length > 36 ? `${name.slice(0, 35)}…` : name
  const sizeText = formatSize(size)
  const dots = '·'.repeat(Math.max(2, 48 - shown.length - sizeText.length))
  console.log(`  ${pc.green('↓')} ${pc.dim(time)}  ${shown} ${pc.dim(dots)} ${pc.green(sizeText)} ${pc.dim('(baixado no celular)')}`)
}

/**
 * 10 -> "10 min", 0.5 -> "30 s", 90 -> "1 h 30 min"
 * @param {number} minutes
 * @returns {string}
 */
function formatMinutes(minutes) {
  if (minutes < 1) return `${Math.round(minutes * 60)} s`
  if (minutes < 60) return `${+minutes.toFixed(1)} min`
  const h = Math.floor(minutes / 60)
  const m = Math.round(minutes % 60)
  return m ? `${h} h ${m} min` : `${h} h`
}

/**
 * imprime o resumo ao sair
 * @param {{ reason?: 'ctrl+c' | 'timeout', minutes?: number }} info
 */
export function printGoodbye({ reason = 'ctrl+c', minutes = 0 } = {}) {
  const summary =
    stats.files === 0
      ? 'nenhum arquivo recebido'
      : `${stats.files} ${stats.files === 1 ? 'arquivo' : 'arquivos'} · ${formatSize(stats.bytes)}`

  if (reason === 'timeout') {
    console.log(`\n  ${pc.yellow(sym.warn)} ${pc.dim(`desligado por inatividade (${formatMinutes(minutes)} sem uso)`)}`)
  }

  console.log(`\n  ${pc.dim('até mais ·')} ${summary}\n`)
}
