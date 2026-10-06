import { mkdirSync } from 'node:fs'
import { homedir } from 'node:os'
import { join, resolve } from 'node:path'
import pc from 'picocolors'
import { findFreePort, getLocalIP } from '../src/network.js'
import { showQR } from '../src/qr.js'
import { createServer } from '../src/server.js'
import { generateToken } from '../src/token.js'

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

/**
 * 2400000 -> "2.3 MB"
 * @param {number} bytes
 * @returns {string}
 */
function formatSize(bytes) {
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
 * C:\Users\zrdep\Downloads\chegou -> ~\Downloads\chegou (só pra exibir)
 * @param {string} path
 * @returns {string}
 */
function prettyPath(path) {
  const home = homedir()
  return path.startsWith(home) ? `~${path.slice(home.length)}` : path
}

/**
 * imprime cada arquivo que chegou
 * @param {{ name: string, size: number }} file
 */
function logFile({ name, size }) {
  const time = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  console.log(`  ${pc.green('✓')} ${name}  ${pc.dim(formatSize(size))}  ${pc.dim(time)}`)
}

// 1. token da sessão
const token = generateToken()

// 2. IP da rede local
const ip = getLocalIP()

// 3. porta livre a partir da preferida
let port
try {
  port = await findFreePort(options.port)
} catch (err) {
  fail(err.message)
}

// 4. cria e liga o servidor em todas as placas de rede
const app = await createServer({ port, dir: options.dir, token, onFile: logFile })

try {
  await app.listen({ port, host: '0.0.0.0' })
} catch (err) {
  fail(`não consegui iniciar o servidor (${err.code ?? err.message})`)
}

// 5. banner
const localUrl = `http://localhost:${port}`
const networkUrl = ip ? `http://${ip}:${port}` : null

console.log()
console.log(`  ${pc.bold(pc.green('●'))} ${pc.bold('chegou')} ${pc.dim('· esperando arquivos')}`)
console.log()
console.log(`  ${pc.dim('local')}   ${pc.cyan(localUrl)}`)
console.log(`  ${pc.dim('rede')}    ${networkUrl ? pc.cyan(networkUrl) : pc.yellow('sem rede local, conecte no wi-fi')}`)
console.log(`  ${pc.dim('pasta')}   ${prettyPath(options.dir)}`)
console.log(`  ${pc.dim('token')}   ${pc.dim(token)}`)

if (port !== options.port) {
  console.log()
  console.log(`  ${pc.yellow('!')} ${pc.dim(`porta ${options.port} ocupada, usando ${port}`)}`)
}

// 6. QR code (só faz sentido com IP de rede: o celular não alcança "localhost")
if (networkUrl) {
  showQR(`${networkUrl}/?t=${token}`)
  console.log(`  ${pc.dim('escaneie com o celular · ctrl+c para sair')}`)
  console.log()
}

// 7. o servidor segura o processo aberto; aqui só fechamos direito no ctrl+c
process.on('SIGINT', async () => {
  console.log(`\n  ${pc.dim('até mais')}\n`)
  await app.close()
  process.exit(0)
})
