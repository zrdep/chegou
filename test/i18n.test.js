import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import { availableLangs, detectLang, setLang, t } from '../src/i18n/index.js'
import en from '../src/i18n/en.js'
import pt from '../src/i18n/pt.js'

/** todas as chaves "a.b.c" e as {variáveis} de cada texto */
function flatten(dict, prefix = '', out = {}) {
  for (const [key, value] of Object.entries(dict)) {
    const path = prefix ? `${prefix}.${key}` : key
    if (value && typeof value === 'object' && !('one' in value && 'other' in value)) flatten(value, path, out)
    else out[path] = [...JSON.stringify(value).matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort().join(',')
  }
  return out
}

function samePlaces(a, b, label) {
  const fa = flatten(a)
  const fb = flatten(b)
  assert.deepEqual(Object.keys(fa).sort(), Object.keys(fb).sort(), `${label}: chaves diferentes`)
  for (const key of Object.keys(fa)) assert.equal(fa[key], fb[key], `${label}: variáveis diferentes em ${key}`)
}

function loadPublic(lang) {
  const window = {}
  runInNewContext(readFileSync(new URL(`../public/i18n/${lang}.js`, import.meta.url), 'utf8'), { window })
  return window.CHEGOU_LOCALES[lang]
}

test('terminal: pt e en têm as mesmas chaves e variáveis', () => {
  samePlaces(pt, en, 'src/i18n')
})

test('celular: pt e en têm as mesmas chaves e variáveis', () => {
  samePlaces(loadPublic('pt'), loadPublic('en'), 'public/i18n')
})

test('t: troca variáveis, plural e fallback', () => {
  setLang('en')
  assert.equal(t('share.notFound', { path: 'x.jpg' }), 'file not found: x.jpg')
  assert.equal(t('nao.existe'), 'nao.existe')
  assert.equal(t('share.notFound'), 'file not found: {path}')
  setLang('pt')
  assert.match(t('share.notFound', { path: 'x' }), /x/)
  setLang('en')
})

test('detectLang: --lang ganha, e normaliza', () => {
  assert.equal(detectLang('pt-BR'), 'pt')
  assert.equal(detectLang('en_US.UTF-8'), 'en')
  assert.ok(availableLangs.includes(detectLang('xx')))
})

test('detectLang: CHEGOU_LANG', () => {
  const old = process.env.CHEGOU_LANG
  process.env.CHEGOU_LANG = 'pt'
  try {
    assert.equal(detectLang(), 'pt')
  } finally {
    if (old === undefined) delete process.env.CHEGOU_LANG
    else process.env.CHEGOU_LANG = old
  }
})
