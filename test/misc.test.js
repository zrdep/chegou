import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { createServer } from 'node:net'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { isNewer } from '../src/cli/update.js'
import { loadSettings, saveSettings } from '../src/cli/settings.js'
import { findFreePort } from '../src/net/network.js'
import { generateToken } from '../src/server/token.js'

test('isNewer', () => {
  assert.equal(isNewer('1.10.0', '1.9.2'), true)
  assert.equal(isNewer('1.7.1', '1.7.0'), true)
  assert.equal(isNewer('2.0.0', '1.99.99'), true)
  assert.equal(isNewer('1.7.0', '1.7.0'), false)
  assert.equal(isNewer('1.6.9', '1.7.0'), false)
  assert.equal(isNewer('1.8.0-beta.1', '1.7.0'), true)
  assert.equal(isNewer('1.7', '1.7.0'), false)
})

test('generateToken: tamanho e aleatoriedade', () => {
  assert.match(generateToken(), /^[0-9a-f]{8}$/)
  assert.match(generateToken(8), /^[0-9a-f]{16}$/)
  const seen = new Set(Array.from({ length: 1000 }, () => generateToken()))
  assert.ok(seen.size > 990)
})

test('settings: padrão, salvar, ler e arquivo estragado', () => {
  const old = process.env.CHEGOU_CONFIG_DIR
  const dir = mkdtempSync(join(tmpdir(), 'chegou-cfg-'))
  process.env.CHEGOU_CONFIG_DIR = dir
  try {
    assert.deepEqual(loadSettings(), { openFolder: true })
    assert.equal(saveSettings({ openFolder: false }), true)
    assert.equal(JSON.parse(readFileSync(join(dir, 'settings.json'), 'utf8')).openFolder, false)
    assert.deepEqual(loadSettings(), { openFolder: false })
    writeFileSync(join(dir, 'settings.json'), '{ quebrado')
    assert.deepEqual(loadSettings(), { openFolder: true })
  } finally {
    if (old === undefined) delete process.env.CHEGOU_CONFIG_DIR
    else process.env.CHEGOU_CONFIG_DIR = old
  }
})

test('findFreePort: pula a porta ocupada', async () => {
  const busy = createServer()
  await new Promise((r) => busy.listen(0, '127.0.0.1', r))
  const { port } = busy.address()
  try {
    const free = await findFreePort(port, { host: '127.0.0.1', attempts: 5 })
    assert.notEqual(free, port)
    assert.ok(free > port && free < port + 5)
    await assert.rejects(findFreePort(port, { host: '127.0.0.1', attempts: 1 }))
  } finally {
    busy.close()
  }
})
