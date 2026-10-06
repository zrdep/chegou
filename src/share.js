import { existsSync, statSync } from 'node:fs'
import { basename, resolve } from 'node:path'

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
