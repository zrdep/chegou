// lê as opções da linha de comando: --port, --dir, --timeout, --relay, --local, --lang

import { homedir } from 'node:os'
import { join, resolve } from 'node:path'
import pc from 'picocolors'
import { DEFAULT_DIR, DEFAULT_PORT } from '../config.js'
import { availableLangs, detectLang, setLang, t } from '../i18n/index.js'

/** texto da ajuda no idioma atual */
export function helpText() {
  return t('help', { port: DEFAULT_PORT, langs: availableLangs.join(', ') })
}

/**
 * encerra com uma mensagem de erro
 * @param {string} message
 * @param {boolean} showHelp mostra a ajuda (só faz sentido em erro de digitação)
 */
export function fail(message, showHelp = true) {
  console.error(`\n  ${pc.red(t('errors.prefix'))} ${message}\n${showHelp ? pc.dim(helpText()) : ''}`)
  process.exit(1)
}

/** troca o "~" do começo pela pasta do usuário (o PowerShell e o cmd não fazem isso) */
function expandHome(path) {
  if (path === '~') return homedir()
  if (path.startsWith('~/') || path.startsWith('~\\')) return join(homedir(), path.slice(2))
  return path
}

/**
 * o idioma precisa estar definido antes de qualquer mensagem de erro,
 * então o --lang é lido primeiro, separado do resto
 * @param {string[]} argv
 */
function findLangFlag(argv) {
  for (let i = 0; i < argv.length; i++) {
    const [flag, value] = argv[i].split(/=(.*)/s)
    if (flag === '--lang') return value ?? argv[i + 1]
  }
  return undefined
}

/**
 * @typedef {Object} Options
 * @property {number} port
 * @property {string} dir
 * @property {number} timeout minutos (0 = nunca desliga)
 * @property {'local' | 'tunnel' | null} mode null = perguntar
 * @property {string[]} items arquivos, pastas ou links passados no comando
 */

/**
 * @param {string[]} argv
 * @returns {Options}
 */
export function parseArgs(argv) {
  const langFlag = findLangFlag(argv)
  setLang(detectLang(langFlag))

  const options = { port: DEFAULT_PORT, dir: DEFAULT_DIR, timeout: 0, mode: null, items: [] }

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]

    if (!arg.startsWith('-')) {
      options.items.push(arg)
      continue
    }

    let [flag, value] = arg.split(/=(.*)/s)

    // valor separado por espaço: pega o próximo item
    const takeValue = () => {
      if (value === undefined) value = argv[++i]
      if (value === undefined || value.startsWith('-')) fail(t('args.needsValue', { flag }))
      return value
    }

    switch (flag) {
      case '--relay':
      case '--tunnel':
      case '-r':
        options.mode = 'tunnel'
        break

      case '--local':
      case '-l':
        options.mode = 'local'
        break

      case '--port':
      case '-p': {
        const port = Number(takeValue())
        if (!Number.isInteger(port) || port < 1 || port > 65535) fail(t('args.badPort', { value }))
        options.port = port
        break
      }

      case '--dir':
      case '-d':
        options.dir = expandHome(takeValue())
        break

      case '--timeout':
      case '-t': {
        const minutes = Number(takeValue())
        if (!Number.isFinite(minutes) || minutes <= 0) fail(t('args.badTimeout', { value }))
        options.timeout = minutes
        break
      }

      case '--lang': {
        const lang = takeValue().toLowerCase().split(/[-_]/)[0]
        if (!availableLangs.includes(lang)) fail(t('args.badLang', { value, langs: availableLangs.join(', ') }))
        break
      }

      case '--help':
      case '-h':
        console.log(helpText())
        process.exit(0)

      default:
        fail(t('args.unknown', { flag }))
    }
  }

  // caminho absoluto, relativo à pasta onde o comando foi rodado
  options.dir = resolve(options.dir)

  return options
}
