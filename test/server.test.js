import { test } from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, mkdtempSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { request as httpRequest } from 'node:http'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { setLang } from '../src/i18n/index.js'
import { createServer } from '../src/server/index.js'
import { createShareManager } from '../src/server/share.js'

setLang('en')
const TOKEN = 'abcd1234'

async function setup({ dir = mkdtempSync(join(tmpdir(), 'chegou-srv-')) } = {}) {
  const files = []
  const problems = []
  const downloads = []
  const shareManager = createShareManager()
  const app = await createServer({
    dir,
    token: TOKEN,
    shareManager,
    onFile: (f) => files.push(f),
    onDownload: (d) => downloads.push(d),
    onProblem: (p) => problems.push(p),
  })
  return { app, dir, files, problems, downloads, shareManager }
}

/** corpo multipart/form-data feito na mão */
function multipart(parts) {
  const boundary = '----chegou' + Math.random().toString(16).slice(2)
  const chunks = []
  for (const { name, content } of parts) {
    chunks.push(Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="files"; filename="${name}"\r\nContent-Type: application/octet-stream\r\n\r\n`))
    chunks.push(Buffer.from(content))
    chunks.push(Buffer.from('\r\n'))
  }
  chunks.push(Buffer.from(`--${boundary}--\r\n`))
  return { payload: Buffer.concat(chunks), headers: { 'content-type': `multipart/form-data; boundary=${boundary}` } }
}

const upload = (app, parts, token = TOKEN) =>
  app.inject({ method: 'POST', url: `/upload?t=${token}`, ...multipart(parts) })

test('página inicial abre sem token', async () => {
  const { app } = await setup()
  const res = await app.inject('/')
  assert.equal(res.statusCode, 200)
  assert.match(res.headers['content-type'], /html/)
  await app.close()
})

test('token: variações erradas dão 401 e avisam o terminal', async () => {
  const { app, problems } = await setup()
  const bad = ['', 'ABCD1234', 'abcd123', 'abcd12345', 'xxxxxxxx', `${TOKEN}&t=${TOKEN}`]
  for (const t of bad) {
    const res = await app.inject(`/api/shared?t=${t}`)
    assert.equal(res.statusCode, 401, `token "${t}"`)
    assert.deepEqual(res.json(), { error: 'unauthorized' })
  }
  assert.equal((await app.inject('/api/shared')).statusCode, 401)
  assert.equal((await app.inject(`/api/shared?t=${TOKEN}`)).statusCode, 200)
  assert.equal(problems.filter((p) => p.kind === 'unauthorized').length, bad.length + 1)
  await app.close()
})

test('upload: um arquivo chega inteiro', async () => {
  const { app, dir, files } = await setup()
  const res = await upload(app, [{ name: 'oi.txt', content: 'olá mundo' }])
  assert.equal(res.statusCode, 200)
  assert.deepEqual(res.json().files, [{ name: 'oi.txt', size: Buffer.byteLength('olá mundo') }])
  assert.equal(readFileSync(join(dir, 'oi.txt'), 'utf8'), 'olá mundo')
  assert.equal(files.length, 1)
  await app.close()
})

test('upload: vários de uma vez e nome repetido', async () => {
  const { app, dir } = await setup()
  const res = await upload(app, [
    { name: 'a.jpg', content: '1' },
    { name: 'a.jpg', content: '2' },
    { name: 'b.png', content: '3' },
  ])
  assert.equal(res.statusCode, 200)
  assert.deepEqual(readdirSync(dir).sort(), ['a (1).jpg', 'a.jpg', 'b.png'])
  await app.close()
})

test('upload: sem token não grava nada', async () => {
  const { app, dir } = await setup()
  const res = await upload(app, [{ name: 'x.txt', content: 'x' }], 'errado')
  assert.equal(res.statusCode, 401)
  assert.deepEqual(readdirSync(dir), [])
  await app.close()
})

test('upload: ../ e nomes perigosos ficam dentro da pasta', async () => {
  const { app, dir } = await setup()
  await upload(app, [
    { name: '../../fuga.txt', content: 'x' },
    { name: 'con', content: 'x' },
    { name: 'foto‮gpj.exe', content: 'x' },
  ])
  assert.deepEqual(readdirSync(dir).sort(), ['_con', 'fotogpj.exe', 'fuga.txt'])
  await app.close()
})

test('upload: nome comprido em bytes é salvo (antes dava 500)', async () => {
  const { app, dir } = await setup()
  const res = await upload(app, [{ name: '日'.repeat(200) + '.jpg', content: 'x' }])
  assert.equal(res.statusCode, 200)
  const [saved] = readdirSync(dir)
  assert.ok(Buffer.byteLength(saved) <= 200)
  await app.close()
})

test('upload: 30 envios ao mesmo tempo com o mesmo nome', async () => {
  const { app, dir } = await setup()
  const results = await Promise.all(
    Array.from({ length: 30 }, (_, i) => upload(app, [{ name: 'mesmo.txt', content: String(i) }])),
  )
  assert.ok(results.every((r) => r.statusCode === 200))
  const names = readdirSync(dir)
  assert.equal(names.length, 30)
  const contents = names.map((n) => readFileSync(join(dir, n), 'utf8')).sort((a, b) => a - b)
  assert.deepEqual(contents, Array.from({ length: 30 }, (_, i) => String(i)))
  await app.close()
})

test('erro no PC: celular recebe só um código, terminal recebe o motivo', async () => {
  // a "pasta" de destino é um arquivo: o mkdir falha
  const base = mkdtempSync(join(tmpdir(), 'chegou-srv-'))
  const notADir = join(base, 'arquivo')
  writeFileSync(notADir, '')
  const { app, problems } = await setup({ dir: notADir })
  const res = await upload(app, [{ name: 'x.txt', content: 'x' }])
  assert.equal(res.statusCode, 500)
  assert.deepEqual(res.json(), { error: 'server_error' })
  assert.ok(!res.body.includes(base), 'não pode vazar o caminho do PC')
  assert.equal(problems.length, 1)
  assert.equal(problems[0].kind, 'failed')
  assert.ok(problems[0].reason)
  await app.close()
})

test('upload interrompido: apaga o pedaço e avisa o terminal', async () => {
  const { app, dir, problems } = await setup()
  await app.listen({ port: 0, host: '127.0.0.1' })
  const { port } = app.server.address()
  const boundary = '----corte'

  await new Promise((resolve) => {
    const req = httpRequest({
      port,
      host: '127.0.0.1',
      method: 'POST',
      path: `/upload?t=${TOKEN}`,
      headers: { 'content-type': `multipart/form-data; boundary=${boundary}`, 'content-length': 10_000_000 },
    })
    req.on('error', () => resolve())
    req.write(`--${boundary}\r\nContent-Disposition: form-data; name="f"; filename="grande.bin"\r\n\r\n`)
    req.write(Buffer.alloc(200_000))
    setTimeout(() => {
      req.destroy()
      resolve()
    }, 300)
  })

  // espera o servidor perceber
  for (let i = 0; i < 50 && !problems.length; i++) await new Promise((r) => setTimeout(r, 50))
  for (let i = 0; i < 50 && readdirSync(dir).length; i++) await new Promise((r) => setTimeout(r, 50))

  assert.deepEqual(readdirSync(dir), [])
  assert.equal(problems[0]?.kind, 'aborted')
  assert.equal(problems[0]?.file, 'grande.bin')
  await app.close()
})

test('arquivos estáticos: sem acesso fora de public/', async () => {
  const { app } = await setup()
  for (const url of ['/../src/main.js', '/%2e%2e/src/main.js', '/..%2fpackage.json', '/%2e%2e%2f%2e%2e%2fpackage.json']) {
    const res = await app.inject(url)
    assert.ok([400, 403, 404].includes(res.statusCode), `${url} -> ${res.statusCode}`)
    assert.ok(!res.body.includes('"dependencies"') && !res.body.includes('createServer'), url)
  }
  assert.equal((await app.inject('/app.js')).statusCode, 200)
  await app.close()
})

test('download: arquivo compartilhado, 404 e token', async () => {
  const { app, shareManager, downloads } = await setup()
  const src = join(mkdtempSync(join(tmpdir(), 'chegou-dl-')), 'relatório final.pdf')
  writeFileSync(src, 'conteudo')
  const item = shareManager.addFile(src)

  const res = await app.inject(`/download/${item.id}?t=${TOKEN}`)
  assert.equal(res.statusCode, 200)
  assert.equal(res.body, 'conteudo')
  assert.equal(res.headers['content-length'], '8')
  assert.match(res.headers['content-disposition'], /filename\*=UTF-8''relat%C3%B3rio%20final\.pdf/)
  assert.deepEqual(downloads, [{ name: 'relatório final.pdf', size: 8 }])

  assert.equal((await app.inject(`/download/999?t=${TOKEN}`)).statusCode, 404)
  assert.equal((await app.inject(`/download/${item.id}`)).statusCode, 401)

  // texto não é baixável
  const text = shareManager.addText('oi')
  assert.equal((await app.inject(`/download/${text.id}?t=${TOKEN}`)).statusCode, 404)
  await app.close()
})

test('download: arquivo apagado depois de compartilhar dá 404', async () => {
  const { app, shareManager } = await setup()
  const { rmSync } = await import('node:fs')
  const src = join(mkdtempSync(join(tmpdir(), 'chegou-dl-')), 'x.txt')
  writeFileSync(src, 'x')
  const item = shareManager.addFile(src)
  rmSync(src)
  assert.equal((await app.inject(`/download/${item.id}?t=${TOKEN}`)).statusCode, 404)
  await app.close()
})

test('eventos (SSE): manda o que já existe e os itens novos', async () => {
  const { app, shareManager } = await setup()
  shareManager.addText('antes')
  await app.listen({ port: 0, host: '127.0.0.1' })
  const { port } = app.server.address()

  const body = await new Promise((resolve, reject) => {
    let data = ''
    const req = httpRequest({ port, host: '127.0.0.1', path: `/events?t=${TOKEN}` }, (res) => {
      assert.equal(res.statusCode, 200)
      assert.match(res.headers['content-type'], /text\/event-stream/)
      res.setEncoding('utf8')
      res.on('data', (chunk) => {
        data += chunk
        if (data.includes('event: init') && !data.includes('depois')) shareManager.addText('depois')
        if (data.includes('event: item')) {
          req.destroy()
          resolve(data)
        }
      })
    })
    req.on('error', reject)
    req.end()
  })

  assert.match(body, /event: init\ndata: \[.*"antes".*\]/)
  assert.match(body, /event: item\ndata: .*"depois"/)
  await app.close()
})

test('eventos (SSE): sem token dá 401', async () => {
  const { app } = await setup()
  assert.equal((await app.inject('/events?t=x')).statusCode, 401)
  await app.close()
})
