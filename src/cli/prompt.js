// pergunta no terminal como o celular vai se conectar (setas + Enter, ou 1/2)

import { emitKeypressEvents } from 'node:readline'
import pc from 'picocolors'
import { t } from '../i18n/index.js'

/**
 * @param {{ hasLan: boolean }} info
 * @returns {Promise<'local' | 'tunnel'>}
 */
export function chooseMode({ hasLan }) {
  const options = [
    { value: 'local', name: t('prompt.localName'), hint: t('prompt.localHint') },
    { value: 'tunnel', name: t('prompt.tunnelName'), hint: t('prompt.tunnelHint') },
  ]
  const nameWidth = Math.max(...options.map((option) => option.name.length)) + 1

  // sem wi-fi/cabo, o túnel é o único caminho que funciona: já começa nele
  let selected = hasLan ? 0 : 1
  const { stdin, stdout } = process

  const render = (first = false) => {
    if (!first) stdout.write(`\x1b[${options.length}A`)
    for (const [i, option] of options.entries()) {
      const active = i === selected
      const marker = active ? pc.green('›') : ' '
      const name = active ? pc.bold(option.name.padEnd(nameWidth)) : pc.dim(option.name.padEnd(nameWidth))
      const warn = option.value === 'local' && !hasLan ? pc.yellow(t('prompt.noLan')) : ''
      stdout.write(`\x1b[2K  ${marker} ${pc.dim(`${i + 1}`)}  ${name} ${pc.dim(option.hint)}${warn}\n`)
    }
  }

  return new Promise((resolve) => {
    stdout.write(`\n  ${pc.bold(t('prompt.question'))}\n\n`)
    render(true)
    stdout.write(pc.dim(`\n  ${t('prompt.keys')}\n`))
    stdout.write('\x1b[2A')

    emitKeypressEvents(stdin)
    stdin.setRawMode(true)
    stdin.resume()

    const finish = (value) => {
      stdin.off('keypress', onKey)
      stdin.setRawMode(false)
      stdin.pause()
      stdout.write('\x1b[2B\n')
      resolve(value)
    }

    const onKey = (str, key = {}) => {
      if (key.ctrl && key.name === 'c') {
        stdin.setRawMode(false)
        stdout.write('\x1b[2B\n')
        process.exit(130)
      }
      if (key.name === 'up' || key.name === 'k') selected = (selected + options.length - 1) % options.length
      else if (key.name === 'down' || key.name === 'j' || key.name === 'tab') selected = (selected + 1) % options.length
      else if (str === '1' || str === '2') selected = Number(str) - 1
      else if (key.name === 'return' || key.name === 'enter') return finish(options[selected].value)
      else return
      render()
      if (str === '1' || str === '2') finish(options[selected].value)
    }

    stdin.on('keypress', onKey)
  })
}
