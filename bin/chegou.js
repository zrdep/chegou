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

  opções:
    --port, -p <número>   porta preferida (padrão: ${DEFAULT_PORT})
    --dir,  -d <caminho>  onde salvar os arquivos recebidos (padrão: ~/Downloads/chegou)
    --help, -h            mostra esta ajuda
`

/**
 * encerra com uma mensagem de erro
 * @param {string} message
 */
function fail(message) {
  console.error(`\n  ${pc.red('erro:')} ${message}\n${pc.dim(HELP)}`)
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
 * @returns {{ port: number, dir: string, items: string[] }}
 */
function parseArgs(argv) {
  const options = { port: DEFAULT_PORT, dir: DEFAULT_DIR, items: [] }

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

try {
  await app.listen({ port, host: '0.0.0.0' })
} catch (err) {
  fail(`não consegui iniciar o servidor (${err.code ?? err.message})`)
}

// 6. banner com o QR code
printBanner({ ip, port, preferredPort: options.port, dir: options.dir, token, version })

// imprime os itens já compartilhados na inicialização
for (const item of shareManager.getAll()) {
  printShared(item)
}

// 7. ouve o terminal interativo: arraste arquivos ou digite link/texto + enter
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
    } catch (err) {
      console.log(`  ${pc.red('!')} ${err.message}`)
    }
  })
}

// 8. o servidor segura o processo aberto; aqui só fechamos direito no ctrl+c
process.on('SIGINT', async () => {
  printGoodbye()
  await app.close()
  process.exit(0)
})
