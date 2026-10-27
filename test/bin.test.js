import { test } from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const BIN = fileURLToPath(new URL('../bin/chegou.js', import.meta.url))

/** roda o bin fingindo outra versão do Node */
function runAs(version, args = [], lang = 'en_US.UTF-8') {
  const code = `
    Object.defineProperty(process, 'versions', { value: { ...process.versions, node: '${version}' } })
    process.argv = [process.argv[0], ${JSON.stringify(BIN)}, ...${JSON.stringify(args)}]
    await import(${JSON.stringify(new URL('../bin/chegou.js', import.meta.url).href)})
  `
  return spawnSync(process.execPath, ['--input-type=module', '-e', code], {
    encoding: 'utf8',
    env: { ...process.env, LC_ALL: lang, LANG: lang, CHEGOU_NO_UPDATE_CHECK: '1' },
    timeout: 20_000,
  })
}

for (const version of ['18.20.0', '20.0.0', '20.18.1', '21.7.3', '22.11.0']) {
  test(`Node ${version}: avisa e sai com 1`, () => {
    const res = runAs(version, ['--help'])
    assert.equal(res.status, 1)
    assert.match(res.stderr, /20\.19\+ or 22\.12\+/)
    assert.ok(res.stderr.includes(version))
  })
}

test('aviso em português quando o sistema está em pt', () => {
  const res = runAs('20.0.0', [], 'pt_BR.UTF-8')
  assert.match(res.stderr, /precisa do Node/)
})

for (const version of ['20.19.0', '22.12.0', '24.0.0']) {
  test(`Node ${version}: passa da checagem`, () => {
    const res = runAs(version, ['--help', '--lang', 'en'])
    assert.equal(res.status, 0, res.stderr)
    assert.match(res.stdout, /--relay/)
  })
}

test('chegou --help de verdade', () => {
  const res = spawnSync(process.execPath, [BIN, '--help', '--lang', 'en'], { encoding: 'utf8', timeout: 20_000 })
  assert.equal(res.status, 0, res.stderr)
  assert.match(res.stdout, /--timeout/)
})

test('chegou --banana sai com erro', () => {
  const res = spawnSync(process.execPath, [BIN, '--banana', '--lang', 'en'], { encoding: 'utf8', timeout: 20_000 })
  assert.equal(res.status, 1)
  assert.match(res.stderr, /--banana/)
})
