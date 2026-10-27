import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { setLang } from '../src/i18n/index.js'
import { createShareManager, looksLikePath, splitDropped } from '../src/server/share.js'

setLang('en')
const isWindows = process.platform === 'win32'

function fixture() {
  const dir = mkdtempSync(join(tmpdir(), 'chegou-share-'))
  writeFileSync(join(dir, 'a.txt'), 'aaa')
  writeFileSync(join(dir, 'b c.txt'), 'bb')
  mkdirSync(join(dir, 'pasta'))
  writeFileSync(join(dir, 'pasta', '1.jpg'), '1')
  writeFileSync(join(dir, 'pasta', '2.jpg'), '22')
  writeFileSync(join(dir, 'pasta', '.oculto'), 'x')
  mkdirSync(join(dir, 'vazia'))
  return dir
}

test('looksLikePath: caminhos', () => {
  for (const p of ['./foto.jpg', '../x', '~/fotos', '/tmp/x', 'C:\\pasta', 'c:/pasta', 'pasta\\arq', 'fto.jpg', 'video.MP4', 'doc.pdf'])
    assert.equal(looksLikePath(p), true, p)
})

test('looksLikePath: textos e links', () => {
  for (const p of ['https://site.com/a.jpg', 'google.com', 'olá tudo bem', 'minha foto.jpg', 'chegou.com.br', 'oi', 'ftp://x/y.zip'])
    assert.equal(looksLikePath(p), false, p)
})

test('splitDropped: aspas e espaços', () => {
  assert.deepEqual(splitDropped('"C:\\a b\\x.jpg" C:\\y.png'), ['C:\\a b\\x.jpg', 'C:\\y.png'])
  assert.deepEqual(splitDropped("'/tmp/a b.jpg' /tmp/c.png"), ['/tmp/a b.jpg', '/tmp/c.png'])
  assert.deepEqual(splitDropped(''), [])
})

test('splitDropped: barra invertida escapando espaço (Mac/Linux)', { skip: isWindows }, () => {
  assert.deepEqual(splitDropped('/tmp/a\\ b.jpg /tmp/c.png'), ['/tmp/a b.jpg', '/tmp/c.png'])
})

test('addText: texto e link', () => {
  const share = createShareManager()
  const text = share.addText('  oi  ')
  assert.equal(text.content, 'oi')
  assert.equal(text.isUrl, false)
  assert.equal(share.addText('https://x.com/a?b=1').isUrl, true)
  assert.throws(() => share.addText('   '), /empty/)
  assert.equal(share.count(), 2)
})

test('addFile: arquivo, pasta e inexistente', () => {
  const dir = fixture()
  const share = createShareManager()
  const item = share.addFile(join(dir, 'a.txt'))
  assert.equal(item.name, 'a.txt')
  assert.equal(item.size, 3)
  assert.throws(() => share.addFile(join(dir, 'pasta')), /folder/)
  assert.throws(() => share.addFile(join(dir, 'nao.txt')), /not found/)
})

test('addArg: arquivo, pasta, texto e caminho errado', () => {
  const dir = fixture()
  const share = createShareManager()

  assert.equal(share.addArg(join(dir, 'a.txt')).added[0].name, 'a.txt')

  const folder = share.addArg(join(dir, 'pasta'))
  assert.deepEqual(folder.added.map((i) => i.name).sort(), ['1.jpg', '2.jpg'])

  assert.equal(share.addArg(join(dir, 'vazia')).errors.length, 1)

  const text = share.addArg('google.com')
  assert.equal(text.added[0].type, 'text')

  const typo = share.addArg('fto.jpg')
  assert.equal(typo.added.length, 0)
  assert.match(typo.errors[0], /not found: fto\.jpg/)
})

test('addInput: arquivo com espaço sem aspas', () => {
  const dir = fixture()
  const share = createShareManager()
  const { added } = share.addInput(join(dir, 'b c.txt'))
  assert.equal(added[0].name, 'b c.txt')
})

test('addInput: PowerShell cola "& " antes', () => {
  const dir = fixture()
  const share = createShareManager()
  const { added } = share.addInput(`& '${join(dir, 'a.txt')}'`)
  assert.equal(added[0]?.name, 'a.txt')
})

test('addInput: vários arrastados, um sumiu', () => {
  const dir = fixture()
  const share = createShareManager()
  const missing = join(dir, 'sumiu.jpg')
  const { added, errors } = share.addInput(`"${join(dir, 'a.txt')}" "${missing}"`)
  assert.deepEqual(added.map((i) => i.name), ['a.txt'])
  assert.equal(errors.length, 1)
  assert.ok(errors[0].includes('sumiu.jpg'))
})

test('addInput: vários caminhos, nenhum existe', () => {
  const share = createShareManager()
  const { added, errors } = share.addInput('./x.jpg ./y.png')
  assert.equal(added.length, 0)
  assert.equal(errors.length, 2)
})

test('addInput: frase comum vira texto', () => {
  const share = createShareManager()
  const { added } = share.addInput('manda a foto.jpg depois')
  assert.equal(added[0].type, 'text')
  assert.equal(added[0].content, 'manda a foto.jpg depois')
})

test('addInput: pasta e linha vazia', () => {
  const dir = fixture()
  const share = createShareManager()
  assert.equal(share.addInput(join(dir, 'pasta')).added.length, 2)
  assert.deepEqual(share.addInput('   '), { added: [], errors: [] })
})

test('toPublic: não expõe o caminho do PC e leva o token', () => {
  const dir = fixture()
  const share = createShareManager()
  share.addFile(join(dir, 'a.txt'))
  const [pub] = share.getPublicItems('abc')
  assert.equal(pub.path, undefined)
  assert.equal(pub.downloadUrl, '/download/1?t=abc')
  assert.ok(!JSON.stringify(pub).includes(dir))
})

test('subscribe: avisa itens novos e para depois de unsubscribe', () => {
  const share = createShareManager()
  const seen = []
  const fn = (event, item) => seen.push([event, item.content])
  share.subscribe(fn)
  share.subscribe(() => { throw new Error('assinante quebrado não derruba os outros') })
  share.addText('um')
  share.unsubscribe(fn)
  share.addText('dois')
  assert.deepEqual(seen, [['item', 'um']])
})
