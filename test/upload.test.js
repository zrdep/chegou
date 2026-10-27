import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { basename, join } from 'node:path'
import { setLang } from '../src/i18n/index.js'
import { sanitizeFilename, uniquePath } from '../src/server/upload.js'

setLang('en')
const bytes = (s) => Buffer.byteLength(s, 'utf8')

test('sanitizeFilename: nome comum continua igual', () => {
  assert.equal(sanitizeFilename('foto.jpg'), 'foto.jpg')
  assert.equal(sanitizeFilename('IMG 2024 (1).HEIC'), 'IMG 2024 (1).HEIC')
  assert.equal(sanitizeFilename('relatório final.pdf'), 'relatório final.pdf')
})

test('sanitizeFilename: tira pastas e ../', () => {
  assert.equal(sanitizeFilename('../../etc/passwd'), 'passwd')
  assert.equal(sanitizeFilename('..\\..\\Windows\\win.ini'), 'win.ini')
  assert.equal(sanitizeFilename('/abs/path/x.txt'), 'x.txt')
})

test('sanitizeFilename: remove caracteres proibidos no Windows e controles', () => {
  assert.equal(sanitizeFilename('a<b>c:d"e|f?g*.txt'), 'abcdefg.txt')
  assert.equal(sanitizeFilename('cor\u001b[31m.txt'), 'cor[31m.txt')
  assert.equal(sanitizeFilename('c1\u0085\u009b.txt'), 'c1.txt')
})

test('sanitizeFilename: remove caracteres invisíveis de direção', () => {
  assert.equal(sanitizeFilename('foto\u202Egpj.exe'), 'fotogpj.exe')
  assert.equal(sanitizeFilename('\u2066a\u2069\u200e\u200f\ufeff.png'), 'a.png')
  assert.equal(sanitizeFilename('ar\u061cabe.txt'), 'arabe.txt')
})

test('sanitizeFilename: pontos e espaços nas pontas', () => {
  assert.equal(sanitizeFilename('.bashrc'), 'bashrc')
  assert.equal(sanitizeFilename('  nome.txt  '), 'nome.txt')
  assert.equal(sanitizeFilename('fim...'), 'fim')
})

test('sanitizeFilename: nome vazio vira "file"', () => {
  assert.equal(sanitizeFilename(''), 'file')
  assert.equal(sanitizeFilename(undefined), 'file')
  assert.equal(sanitizeFilename('...'), 'file')
  assert.equal(sanitizeFilename('<>:'), 'file')
  assert.equal(sanitizeFilename('.jpg'), 'jpg')
})

test('sanitizeFilename: nomes reservados do Windows ganham _', () => {
  assert.equal(sanitizeFilename('con'), '_con')
  assert.equal(sanitizeFilename('NUL.txt'), '_NUL.txt')
  assert.equal(sanitizeFilename('com1.tar.gz'), '_com1.tar.gz')
  assert.equal(sanitizeFilename('console.log'), 'console.log')
})

test('sanitizeFilename: junta acentos separados (NFC)', () => {
  assert.equal(sanitizeFilename('cafe\u0301.txt'), 'café.txt')
})

test('sanitizeFilename: corta por bytes, não por letras', () => {
  const jp = sanitizeFilename('日'.repeat(200) + '.jpg')
  assert.ok(bytes(jp) <= 200, `${bytes(jp)} bytes`)
  assert.ok(jp.endsWith('.jpg'))

  const ascii = sanitizeFilename('a'.repeat(500) + '.txt')
  assert.equal(bytes(ascii), 200)
  assert.ok(ascii.endsWith('.txt'))
})

test('sanitizeFilename: não parte emoji no meio', () => {
  const name = sanitizeFilename('😀'.repeat(100) + '.png')
  assert.ok(bytes(name) <= 200)
  assert.ok(!name.includes('\ufffd'))
  assert.equal([...name.replace('.png', '')].every((c) => c === '😀'), true)
  assert.equal(sanitizeFilename('👨‍👩‍👧.jpg'), '👨‍👩‍👧.jpg')
})

test('sanitizeFilename: extensão gigante não é extensão', () => {
  const name = sanitizeFilename('a.' + 'b'.repeat(400))
  assert.ok(bytes(name) <= 200)
  assert.ok(name.startsWith('a.b'))
})

test('sanitizeFilename: sempre cabe no limite do sistema (fuzz)', () => {
  const pool = ['a', 'é', '日', '😀', '.', ' ', '/', '\\', ':', '\u202e', '\u0000', '-', '_']
  for (let i = 0; i < 500; i++) {
    let s = ''
    const len = Math.floor(Math.random() * 400)
    for (let j = 0; j < len; j++) s += pool[Math.floor(Math.random() * pool.length)]
    const out = sanitizeFilename(s)
    assert.ok(out.length > 0, JSON.stringify(s))
    assert.ok(bytes(out) <= 200, JSON.stringify(s))
    assert.ok(!/[/\\:\u0000\u202e]/.test(out), JSON.stringify(out))
    assert.ok(!/^[.\s]/.test(out), JSON.stringify(out))
  }
})

test('uniquePath: não sobrescreve', () => {
  const dir = mkdtempSync(join(tmpdir(), 'chegou-test-'))
  assert.equal(basename(uniquePath(dir, 'foto.jpg')), 'foto.jpg')
  writeFileSync(join(dir, 'foto.jpg'), '')
  assert.equal(basename(uniquePath(dir, 'foto.jpg')), 'foto (1).jpg')
  writeFileSync(join(dir, 'foto (1).jpg'), '')
  assert.equal(basename(uniquePath(dir, 'foto.jpg')), 'foto (2).jpg')
  writeFileSync(join(dir, 'semext'), '')
  assert.equal(basename(uniquePath(dir, 'semext')), 'semext (1)')
})
