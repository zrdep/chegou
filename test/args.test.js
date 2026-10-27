import { test, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import { homedir } from 'node:os'
import { join, resolve } from 'node:path'
import { parseArgs } from '../src/cli/args.js'
import { DEFAULT_PORT } from '../src/config.js'

// parseArgs encerra o processo em erro: aqui o exit vira uma exceção
let exit, error, log
beforeEach(() => {
  exit = process.exit
  error = console.error
  log = console.log
  process.exit = (code) => {
    throw Object.assign(new Error('exit'), { exitCode: code })
  }
  console.error = () => {}
  console.log = () => {}
})
afterEach(() => {
  process.exit = exit
  console.error = error
  console.log = log
})

const parse = (...argv) => parseArgs(['--lang', 'en', ...argv])
const exits = (argv, code = 1) => assert.throws(() => parse(...argv), (e) => e.exitCode === code)

test('padrão', () => {
  const o = parse()
  assert.equal(o.port, DEFAULT_PORT)
  assert.equal(o.timeout, 0)
  assert.equal(o.mode, null)
  assert.deepEqual(o.items, [])
  assert.equal(o.open, undefined)
})

test('modo: --relay, --tunnel, -r, --local, -l', () => {
  for (const f of ['--relay', '--tunnel', '-r']) assert.equal(parse(f).mode, 'tunnel')
  for (const f of ['--local', '-l']) assert.equal(parse(f).mode, 'local')
})

test('--port com espaço, com = e atalho', () => {
  assert.equal(parse('--port', '3000').port, 3000)
  assert.equal(parse('--port=3001').port, 3001)
  assert.equal(parse('-p', '3002').port, 3002)
})

test('--port inválida encerra', () => {
  exits(['--port', '0'])
  exits(['--port', '70000'])
  exits(['--port', 'abc'])
  exits(['--port', '80.5'])
  exits(['--port'])
  exits(['--port', '--local'])
})

test('--timeout', () => {
  assert.equal(parse('--timeout', '10').timeout, 10)
  assert.equal(parse('-t', '0.5').timeout, 0.5)
  exits(['--timeout', '0'])
  exits(['--timeout', '-5'])
  exits(['--timeout', 'x'])
})

test('--dir vira caminho absoluto e entende ~', () => {
  assert.equal(parse('--dir', 'saida').dir, resolve('saida'))
  assert.equal(parse('-d', '~/x').dir, join(homedir(), 'x'))
  assert.equal(parse('--dir', '~').dir, homedir())
})

test('--open', () => {
  assert.equal(parse('--open').open, 'toggle')
  assert.equal(parse('--open', 'on').open, true)
  assert.equal(parse('--open', 'off').open, false)
  assert.equal(parse('--open=sim').open, true)
  assert.equal(parse('--open', 'não').open, false)
  // "--open foto.jpg": a foto é um item, não o valor
  const o = parse('--open', 'foto.jpg')
  assert.equal(o.open, 'toggle')
  assert.deepEqual(o.items, ['foto.jpg'])
  exits(['--open=talvez'])
})

test('--lang', () => {
  assert.doesNotThrow(() => parseArgs(['--lang', 'pt-BR']))
  assert.doesNotThrow(() => parseArgs(['--lang=EN']))
  assert.throws(() => parseArgs(['--lang', 'xx']), (e) => e.exitCode === 1)
})

test('itens e flags misturados', () => {
  const o = parse('a.jpg', '--local', 'https://x.com', 'b c.png')
  assert.deepEqual(o.items, ['a.jpg', 'https://x.com', 'b c.png'])
  assert.equal(o.mode, 'local')
})

test('flag desconhecida encerra com 1, --help com 0', () => {
  exits(['--banana'])
  exits(['-x'])
  exits(['--help'], 0)
  exits(['-h'], 0)
})
