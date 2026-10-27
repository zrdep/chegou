import { existsSync, readdirSync, statSync } from 'node:fs'
import { basename, join, resolve } from 'node:path'
import { MAX_FOLDER_FILES } from '../config.js'
import { t } from '../i18n/index.js'

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

// extensões comuns: "fto.jpg" é quase certamente um arquivo digitado errado,
// mas "google.com" é um site (por isso .com, .br etc. não entram aqui)
const FILE_EXTENSIONS = /\.(jpe?g|png|gif|webp|heic|heif|bmp|svg|mp4|mov|mkv|avi|webm|mp3|m4a|wav|ogg|flac|pdf|docx?|xlsx?|pptx?|odt|txt|csv|json|md|zip|rar|7z|tar|gz|apk|exe|msi|dmg|iso)$/i

/**
 * parece um caminho de arquivo? (mesmo que não exista)
 *   ./foto.jpg, ~/fotos, C:\pasta, /tmp/x, fto.jpg  -> sim
 *   https://site.com, google.com, "olá tudo bem"     -> não
 * @param {string} text
 */
export function looksLikePath(text) {
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(text)) return false // url
  if (/^(\.{1,2}[\\/]|~[\\/]|\/|[a-z]:[\\/])/i.test(text) || text.includes('\\')) return true
  return !/\s/.test(text) && FILE_EXTENSIONS.test(text)
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
      throw new Error(t('share.notFound', { path: filePath }))
    }

    const stat = statSync(fullPath)
    if (stat.isDirectory()) {
      throw new Error(t('share.isFolder', { path: filePath }))
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
    if (!trimmed) throw new Error(t('share.empty'))

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

    if (!files.length) return { added: [], errors: [t('share.emptyFolder', { name: basename(full) })] }

    const errors = []
    if (files.length > MAX_FOLDER_FILES) {
      errors.push(t('share.folderLimit', { name: basename(full), count: files.length, max: MAX_FOLDER_FILES }))
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
    // caminho que não existe: avisa em vez de mandar o caminho como texto
    if (looksLikePath(arg)) return { added: [], errors: [t('share.notFound', { path: arg })] }
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

    // vários caminhos arrastados: compartilha os que existem e avisa dos que sumiram.
    // se algum pedaço não parece caminho, a linha inteira é um texto comum
    const tokens = splitDropped(line)
    const kinds = tokens.map(kindOf)
    const allPaths = tokens.every((token, i) => kinds[i] || looksLikePath(token))
    if (tokens.length > 1 && allPaths && kinds.some(Boolean)) {
      const added = []
      const errors = []
      tokens.forEach((token, i) => {
        if (!kinds[i]) {
          errors.push(t('share.notFound', { path: token }))
        } else if (kinds[i] === 'dir') {
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

    // caminhos que não existem (digitados errado ou arquivos apagados)
    if (tokens.length > 1 && allPaths) {
      return { added: [], errors: tokens.map((token) => t('share.notFound', { path: token })) }
    }
    if (looksLikePath(unquoted)) return { added: [], errors: [t('share.notFound', { path: unquoted })] }

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
