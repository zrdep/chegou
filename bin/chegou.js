import { mkdirSync } from 'node:fs'
import { homedir } from 'node:os'
import { join, resolve } from 'node:path'

const DEFAULT_PORT = 8080
const DEFAULT_DIR = join(homedir(), 'Downloads', 'chegou')

const HELP = `
  uso: chegou [opções]

  --port, -p <número>   porta preferida (padrão: ${DEFAULT_PORT})
  --dir,  -d <caminho>  onde salvar os arquivos (padrão: ~/Downloads/chegou)
  --help, -h            mostra esta ajuda
`

/**
 * encerra com uma mensagem de erro
 * @param {string} message
 */
function fail(message) {
  console.error(`\n  erro: ${message}\n${HELP}`)
  process.exit(1)
}

/**
 * troca o "~" do começo pela pasta do usuário
 * @param {string} path
 * @returns {string}
 */
function expandHome(path) {
  if (path === '~') return homedir()
  if (path.startsWith('~/') || path.startsWith('~\\')) return join(homedir(), path.slice(2))
  return path
}

/**
 * lê as flags da linha de comando
 * @param {string[]} argv
 * @returns {{ port: number, dir: string }}
 */
function parseArgs(argv) {
  const options = { port: DEFAULT_PORT, dir: DEFAULT_DIR }

  for (let i = 0; i < argv.length; i++) {
    let [flag, value] = argv[i].split(/=(.*)/s)

    // valor separado por espaço: pega o próximo item
    const takeValue = () => {
      if (value === undefined) value = argv[++i]
      if (value === undefined || value.startsWith('-')) fail(`${flag} precisa de um valor`)
      return value
    }

    switch (flag) {
      case '--port':
      case '-p': {
        const port = Number(takeValue())
        if (!Number.isInteger(port) || port < 1 || port > 65535) {
          fail(`porta inválida: ${value} (use um número entre 1 e 65535)`)
        }
        options.port = port
        break
      }

      case '--dir':
      case '-d':
        options.dir = expandHome(takeValue())
        break

      case '--help':
      case '-h':
        console.log(HELP)
        process.exit(0)

      default:
        fail(`opção desconhecida: ${flag}`)
    }
  }

  // caminho absoluto, relativo à pasta onde o comando foi rodado
  options.dir = resolve(options.dir)

  return options
}

const options = parseArgs(process.argv.slice(2))

try {
  mkdirSync(options.dir, { recursive: true })
} catch (err) {
  fail(`não consegui criar a pasta ${options.dir} (${err.code})`)
}

console.log(options)
