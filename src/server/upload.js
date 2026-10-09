import { createWriteStream, existsSync } from 'node:fs'
import { mkdir, rm, stat } from 'node:fs/promises'
import { basename, extname, join } from 'node:path'
import { pipeline } from 'node:stream/promises'
import { t } from '../i18n/index.js'

// caracteres proibidos no windows + caracteres de controle
const FORBIDDEN = /[<>:"/\\|?*\u0000-\u001f\u007f]/g

// nomes que o Windows reserva pra dispositivos
const RESERVED = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i

const MAX_LENGTH = 200

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

  if (!base) base = t('upload.fallbackName')
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

/**
 * abre o arquivo pra escrita sem nunca sobrescrever
 * @param {string} dir
 * @param {string} filename
 * @returns {Promise<{ path: string, stream: import('node:fs').WriteStream }>}
 */
async function openUnique(dir, filename) {
  for (let attempt = 0; attempt < 100; attempt++) {
    const path = uniquePath(dir, filename)
    const stream = createWriteStream(path, { flags: 'wx' })

    try {
      await new Promise((resolve, reject) => {
        stream.once('open', resolve)
        stream.once('error', reject)
      })
      return { path, stream }
    } catch (err) {
      if (err.code !== 'EEXIST') throw err
    }
  }

  throw new Error(t('upload.noFreeName', { name: filename }))
}

/**
 * cria o handler da rota de upload
 * @param {string} destDir pasta onde os arquivos são salvos
 * @param {{ onFile?: (file: { name: string, size: number }) => void }} options
 * @returns {function}
 */
export function createUploadHandler(destDir, { onFile } = {}) {
  return async (request, reply) => {
    await mkdir(destDir, { recursive: true })

    const saved = []

    for await (const part of request.files()) {
      const filename = sanitizeFilename(part.filename)
      const { path, stream } = await openUnique(destDir, filename)

      try {
        await pipeline(part.file, stream)
      } catch (err) {
        // conexão caiu no meio: apaga o pedaço pela metade
        await rm(path, { force: true })
        throw err
      }

      // passou do limite de tamanho do multipart: arquivo veio cortado
      if (part.file.truncated) {
        await rm(path, { force: true })
        return reply.code(413).send({ error: 'too_large', file: filename, files: saved })
      }

      const { size } = await stat(path)
      const file = { name: basename(path), size }

      saved.push(file)
      onFile?.(file)
    }

    return { files: saved }
  }
}
