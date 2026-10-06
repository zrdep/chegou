import { existsSync } from 'node:fs'
import { extname, join } from 'node:path'

// caracteres proibidos no windows + caracteres de controle
const FORBIDDEN = /[<>:"/\\|?*\u0000-\u001f\u007f]/g

// nomes que o Windows reserva pra dispositivos
const RESERVED = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i

const MAX_LENGTH = 200
const FALLBACK = 'arquivo'

/**
 * transforma o nome enviado pelo celular num nome seguro pra salvar
 * @param {string} name
 * @returns {string}
 */
export function sanitizeFilename(name) {
  // fica só com a última parte: "../../pasta/foto.jpg" vira "foto.jpg"
  let clean = String(name ?? '').split(/[/\\]/).pop()

  clean = clean
    .normalize('NFC') // iphone manda acento "separado" (e + ´), aqui junta de volta
    .replace(FORBIDDEN, '')
    .replace(/^[.\s]+/, '') 
    .replace(/[.\s]+$/, '') 
    .trim()

  const ext = extname(clean)
  let base = ext ? clean.slice(0, -ext.length) : clean

  if (!base) base = FALLBACK
  if (RESERVED.test(base)) base = `_${base}`

  const room = MAX_LENGTH - ext.length
  if (base.length > room) base = base.slice(0, room)

  return base + ext
}

/**
 * devolve um caminho que ainda não existe na pasta
 * se "foto.jpg" já existe, tenta "foto (1).jpg", "foto (2).jpg"
 * @param {string} dir pasta de destino
 * @param {string} filename nome já sanitizado
 * @returns {string} caminho completo livre
 */
export function uniquePath(dir, filename) {
  const ext = extname(filename)
  const base = ext ? filename.slice(0, -ext.length) : filename

  let candidate = join(dir, filename)
  let n = 1

  while (existsSync(candidate)) {
    candidate = join(dir, `${base} (${n})${ext}`)
    n++
  }

  return candidate
}
