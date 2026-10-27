#!/usr/bin/env node

// confere a versão do Node ANTES de carregar o resto: as dependências
// (fastify e plugins) quebram com um erro confuso em versões antigas
const [major, minor] = process.versions.node.split('.').map(Number)
const supported = (major === 20 && minor >= 19) || (major === 22 && minor >= 12) || major >= 23

if (!supported) {
  const locale = process.env.LC_ALL || process.env.LANG || Intl.DateTimeFormat().resolvedOptions().locale
  const pt = /^pt/i.test(locale)
  const message = pt
    ? `o chegou precisa do Node 20.19+ ou 22.12+ (você tem o ${process.versions.node}).\n  atualize em https://nodejs.org`
    : `chegou needs Node 20.19+ or 22.12+ (you have ${process.versions.node}).\n  update at https://nodejs.org`
  console.error(`\n  ${message}\n`)
  process.exit(1)
}

const { run } = await import('../src/main.js')
await run()
