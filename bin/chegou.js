#!/usr/bin/env node

import { mkdirSync, readFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join, resolve } from 'node:path'
import pc from 'picocolors'
import { createInterface } from 'node:readline'
import { findFreePort, getLocalIP } from '../src/network.js'
import { createServer } from '../src/server.js'
import { createShareManager } from '../src/share.js'
import { generateToken } from '../src/token.js'
import { chooseMode } from '../src/prompt.js'
import { openTunnel } from '../src/tunnel.js'
import { printBanner, printDownloaded, printFile, printGoodbye, printShared } from '../src/ui.js'

const { version } = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'))

const DEFAULT_PORT = 8080
const DEFAULT_DIR = join(homedir(), 'Downloads', 'chegou')

const HELP = `
  uso: chegou [opções] [arquivos ou links...]

  exemplos:
    chegou                      # modo padrão (receber ou arrastar arquivos)
    chegou foto.jpg video.mp4   # disponibiliza arquivos pro celular baixar
    chegou https://meusite.com  # manda link direto pro celular abrir
    chegou --relay              # usa o túnel (funciona fora do wi-fi)
    chegou --local              # usa a rede local sem perguntar

  opções:
    --relay, --tunnel, -r túnel Cloudflare: funciona de qualquer rede (até 100 MB por arquivo)
    --local, -l           rede local, sem perguntar
    --port, -p <número>   porta preferida (padrão: ${DEFAULT_PORT})
    --dir,  -d <caminho>  onde salvar os arquivos recebidos (padrão: ~/Downloads/chegou)
    --timeout, -t <min>   desliga sozinho depois de X minutos sem uso
    --help, -h            mostra esta ajuda
`

/**
 * encerra com uma mensagem de erro
 * @param {string} message
 * @param {boolean} showHelp mostra a ajuda (só faz sentido em erro de digitação)
 */
function fail(message, showHelp = true) {
  console.error(`\n  ${pc.red('erro:')} ${message}\n${showHelp ? pc.dim(HELP) : ''}`)
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
 * lê as flags e arquivos passados na linha de comando
 * @param {string[]} argv
 * @returns {{ port: number, dir: string, timeout: number, mode: 'local' | 'tunnel' | null, items: string[] }}
 */
function parseArgs(argv) {
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
      if (value === undefined || value.startsWith('-')) fail(`${flag} precisa de um valor`)
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

      case '--timeout':
      case '-t': {
        const minutes = Number(takeValue())
        if (!Number.isFinite(minutes) || minutes <= 0) {
          fail(`tempo inválido: ${value} (use minutos, ex: --timeout 10 ou --timeout 0.5)`)
        }
        options.timeout = minutes
        break
      }

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


// 2. IP da rede local
const ip = getLocalIP()

// modo de conexão: flag manda; sem flag, pergunta (se tiver alguém no terminal)
let mode = options.mode
if (!mode) {
  mode = process.stdin.isTTY && process.stdout.isTTY ? await chooseMode({ hasLan: Boolean(ip) }) : 'local'
}

// token da sessão: no túnel a url é pública, então o token fica mais longo
const token = generateToken(mode === 'tunnel' ? 8 : 4)

// 3. porta livre a partir da preferida
let port
try {
  port = await findFreePort(options.port)
} catch (err) {
  fail(err.message)
}

// 4. gerenciador de arquivos/textos do PC pro celular
const shareManager = createShareManager()
for (const rawItem of options.items) {
  try {
    shareManager.add(rawItem)
  } catch (err) {
    console.error(`  ${pc.yellow('!')} ${err.message}`)
  }
}

// 5. cria e liga o servidor em todas as placas de rede
const app = await createServer({
  port,
  dir: options.dir,
  token,
  shareManager,
  onFile: printFile,
  onDownload: printDownloaded,
})

// ---------- desligar sozinho (--timeout) ----------
// conta o tempo SEM uso: cada requisição zera o relógio, e nunca desliga
// no meio de um envio. o /events fica aberto pra sempre, então não conta.
let idleTimer = null
let inFlight = 0
const counted = new WeakSet()

function resetIdle() {
  if (!options.timeout) return
  clearTimeout(idleTimer)
  idleTimer = setTimeout(onIdle, options.timeout * 60_000)
}

function onIdle() {
  // ainda tem upload/download rolando: espera mais um pouco
  if (inFlight > 0) return resetIdle()
  shutdown('timeout')
}

function finishRequest(request) {
  if (!counted.has(request)) return
  counted.delete(request)
  inFlight--
  resetIdle()
}

if (options.timeout) {
  app.addHook('onRequest', async (request) => {
    if (request.url.startsWith('/events')) return
    counted.add(request)
    inFlight++
    resetIdle()
  })
  app.addHook('onResponse', async (request) => finishRequest(request))
  app.addHook('onRequestAbort', async (request) => finishRequest(request))
}

let closing = false
let tunnel = null

/**
 * fecha o servidor e se despede
 * @param {'ctrl+c' | 'timeout'} reason
 */
async function shutdown(reason) {
  if (closing) return
  closing = true
  clearTimeout(idleTimer)
  printGoodbye({ reason, minutes: options.timeout })
  if (tunnel) {
    await tunnel.close()
  }
  await app.close()
  process.exit(0)
}

try {
  await app.listen({ port, host: '0.0.0.0' })
} catch (err) {
  fail(`não consegui iniciar o servidor (${err.code ?? err.message})`, false)
}

// 6. túnel Cloudflare (modo túnel)
let relayUrl = null
if (mode === 'tunnel') {
  const status = (message) => process.stdout.write(`\r\x1b[2K  ${pc.cyan('●')} ${pc.dim(message)}`)
  try {
    tunnel = await openTunnel(port, { onStatus: status })
    relayUrl = tunnel.url
    process.stdout.write('\r\x1b[2K')
  } catch (err) {
    process.stdout.write('\r\x1b[2K')
    if (!ip) fail(`não consegui abrir o túnel (${err.message}) e o PC não está em nenhuma rede local`, false)
    console.log(`  ${pc.yellow('!')} não consegui abrir o túnel (${err.message}), seguindo na rede local`)
    mode = 'local'
  }
}

// 7. banner com o QR code
printBanner({
  ip,
  port,
  preferredPort: options.port,
  dir: options.dir,
  token,
  version,
  timeout: options.timeout,
  relayUrl,
})
resetIdle()

// imprime os itens já compartilhados na inicialização
for (const item of shareManager.getAll()) {
  printShared(item)
}

// 8. ouve o terminal interativo: arraste arquivos ou digite link/texto + enter
if (process.stdin.isTTY || !process.env.CI) {
  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: false,
  })

  rl.on('line', (line) => {
    const trimmed = line.trim()
    if (!trimmed) return
    try {
      const added = shareManager.add(trimmed)
      printShared(added)
      resetIdle()
    } catch (err) {
      console.log(`  ${pc.red('!')} ${err.message}`)
    }
  })
}

// 8. o servidor segura o processo aberto; aqui só fechamos direito no ctrl+c
process.on('SIGINT', () => shutdown('ctrl+c'))
