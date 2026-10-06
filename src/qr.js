import qrcode from 'qrcode-terminal'

/**
 * gera o QR code como texto (sem imprimir)
 * @param {string} url url completa com o token, ex: http://192.168.1.15:8080/?t=a8f3k2x9
 * @returns {string[]} linhas do QR
 */
export function renderQR(url) {
  let output = ''

  // o callback do qrcode-terminal roda na hora, então dá pra capturar o texto
  qrcode.generate(url, { small: true }, (qr) => {
    output = qr
  })

  return output.split('\n').filter((line) => line.trim() !== '')
}

/**
 * desenha o QR code no terminal
 * @param {string} url
 */
export function showQR(url) {
  const lines = renderQR(url).map((line) => `  ${line}`)
  console.log(`\n${lines.join('\n')}\n`)
}
