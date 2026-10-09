import { existsSync, readdirSync, statSync } from 'node:fs'
import { basename, join, resolve } from 'node:path'

// limite de arquivos de uma pasta de uma vez, pra ninguém arrastar o C:\ sem querer
const MAX_FOLDER_FILES = 200

/**
 * @typedef {Object} SharedItem
 * @property {string} id
 * @property {'file' | 'text'} type
 * @property {string} [name]
 * @property {number} [size]
 * @property {string} [path]
 * @property {string} [content]
 * @property {boolean} [isUrl]
 * @property {number} createdAt
 */

/**
 * separa o que o terminal cola quando você arrasta vários arquivos:
 *   Windows:  "C:\pasta com espaço\a.jpg" C:\b.png   (aspas só em quem tem espaço)
 *   Mac/Linux: '/tmp/a b.jpg' /tmp/c.png  ou  /tmp/a\ b.jpg
 * @param {string} line
 * @returns {string[]}
 */
export function splitDropped(line) {
  const isWindows = process.platform === 'win32'
  const pattern = isWindows ? /"([^"]+)"|'([^']+)'|(\S+)/g : /"([^"]+)"|'([^']+)'|((?:\\ |\S)+)/g
  const tokens = []

  for (const match of line.matchAll(pattern)) {
    const token = match[1] ?? match[2] ?? (isWindows ? match[3] : match[3].replace(/\\ /g, ' '))
    if (token) tokens.push(token)
  }

  return tokens
}

/**
 * o caminho existe e é um arquivo (ou pasta)?
 * @param {string} path
 * @returns {'file' | 'dir' | null}
 */
function kindOf(path) {
  try {
    const stat = statSync(resolve(path))
    return stat.isDirectory() ? 'dir' : 'file'
  } catch {
    return null
  }
}

/**
 * gerencia itens compartilhados do PC para o celular
 */
export function createShareManager() {
  /** @type {Map<string, SharedItem>} */
  const items = new Map()
  const subscribers = new Set()
  let nextId = 1

  function notify(event, data) {
    for (const sub of subscribers) {
      try {
        sub(event, data)
      } catch {
        // ignore subscriber error
      }
    }
  }

  /**
   * adiciona um arquivo pelo caminho do disco
   * @param {string} filePath
   * @returns {SharedItem}
   */
  function addFile(filePath) {
    const fullPath = resolve(filePath)
    if (!existsSync(fullPath)) {
      throw new Error(`arquivo não encontrado: ${filePath}`)
    }

    const stat = statSync(fullPath)
    if (stat.isDirectory()) {
      throw new Error(`caminho é uma pasta, selecione arquivos individuais: ${filePath}`)
    }

    const id = String(nextId++)
    const item = {
      id,
      type: 'file',
      name: basename(fullPath),
      size: stat.size,
      path: fullPath,
      createdAt: Date.now(),
    }

    items.set(id, item)
    notify('item', toPublic(item))
    return item
  }

  /**
   * adiciona um texto ou link
   * @param {string} content
   * @returns {SharedItem}
   */
  function addText(content) {
    const trimmed = String(content ?? '').trim()
    if (!trimmed) throw new Error('texto vazio')

    const isUrl = /^https?:\/\/\S+$/i.test(trimmed)
    const id = String(nextId++)
    const item = {
      id,
      type: 'text',
      content: trimmed,
      isUrl,
      createdAt: Date.now(),
    }

    items.set(id, item)
    notify('item', toPublic(item))
    return item
  }

  /**
   * adiciona qualquer entrada (caminho de arquivo, link ou texto)
   * detecta automaticamente se for arquivo existente no sistema
   * @param {string} rawInput
   * @returns {SharedItem}
   */
  function add(rawInput) {
    let clean = String(rawInput ?? '').trim()
    // remove aspas que o Windows terminal costuma colocar ao arrastar arquivos
    if ((clean.startsWith('"') && clean.endsWith('"')) || (clean.startsWith("'") && clean.endsWith("'"))) {
      clean = clean.slice(1, -1).trim()
    }

    if (!clean) throw new Error('entrada vazia')

    try {
      if (existsSync(resolve(clean))) {
        const stat = statSync(resolve(clean))
        if (!stat.isDirectory()) {
          return addFile(clean)
        }
      }
    } catch {
      // not a valid path, treat as text
    }

    return addText(clean)
  }

  /**
   * compartilha os arquivos que estão direto dentro de uma pasta
   * (sem entrar em subpastas e ignorando arquivos ocultos)
   * @param {string} dirPath
   * @returns {{ added: SharedItem[], errors: string[] }}
   */
  function addFolder(dirPath) {
    const full = resolve(dirPath)
    const files = readdirSync(full, { withFileTypes: true })
      .filter((entry) => entry.isFile() && !entry.name.startsWith('.'))
      .map((entry) => join(full, entry.name))

    if (!files.length) return { added: [], errors: [`a pasta ${basename(full)} não tem arquivos`] }

    const errors = []
    if (files.length > MAX_FOLDER_FILES) {
      errors.push(`a pasta ${basename(full)} tem ${files.length} arquivos, mandei só os ${MAX_FOLDER_FILES} primeiros`)
    }

    return { added: files.slice(0, MAX_FOLDER_FILES).map(addFile), errors }
  }

  /**
   * um argumento da linha de comando (já separado pelo terminal):
   * arquivo, pasta ou texto/link
   * @param {string} arg
   * @returns {{ added: SharedItem[], errors: string[] }}
   */
  function addArg(arg) {
    const kind = kindOf(arg)
    if (kind === 'file') return { added: [addFile(arg)], errors: [] }
    if (kind === 'dir') return addFolder(arg)
    return { added: [addText(arg)], errors: [] }
  }

  /**
   * entende o que foi digitado/arrastado no terminal: um ou vários arquivos,
   * ou um texto/link. devolve o que foi adicionado e os erros (ex: pastas)
   * @param {string} rawInput
   * @returns {{ added: SharedItem[], errors: string[] }}
   */
  function addInput(rawInput) {
    // o PowerShell às vezes cola "& " antes do caminho arrastado
    const line = String(rawInput ?? '').trim().replace(/^&\s+/, '')
    if (!line) return { added: [], errors: [] }

    // um arquivo só (mesmo com espaço no nome, sem aspas)
    const unquoted = line.replace(/^(["'])(.*)\1$/, '$2')
    if (kindOf(unquoted) === 'file') return { added: [addFile(unquoted)], errors: [] }

    // vários caminhos: só vale se TODOS existirem, senão é um texto comum
    const tokens = splitDropped(line)
    const kinds = tokens.map(kindOf)
    if (tokens.length > 1 && kinds.every(Boolean)) {
      const added = []
      const errors = []
      tokens.forEach((token, i) => {
        if (kinds[i] === 'dir') {
          const folder = addFolder(token)
          added.push(...folder.added)
          errors.push(...folder.errors)
        } else {
          added.push(addFile(token))
        }
      })
      return { added, errors }
    }

    // uma pasta: manda todos os arquivos de dentro
    if (kindOf(unquoted) === 'dir') return addFolder(unquoted)

    return { added: [addText(line)], errors: [] }
  }

  /**
   * converte item interno para formato público seguro
   * @param {SharedItem} item
   * @param {string} [token]
   */
  function toPublic(item, token = '') {
    const tParam = token ? `?t=${encodeURIComponent(token)}` : ''
    return {
      id: item.id,
      type: item.type,
      name: item.name,
      size: item.size,
      downloadUrl: item.type === 'file' ? `/download/${item.id}${tParam}` : undefined,
      content: item.content,
      isUrl: item.isUrl,
      createdAt: item.createdAt,
    }
  }

  return {
    add,
    addInput,
    addArg,
    addFile,
    addText,
    getItem: (id) => items.get(String(id)),
    getAll: () => Array.from(items.values()),
    getPublicItems: (token) => Array.from(items.values()).map((it) => toPublic(it, token)),
    toPublic,
    subscribe: (fn) => subscribers.add(fn),
    unsubscribe: (fn) => subscribers.delete(fn),
    count: () => items.size,
  }
}
