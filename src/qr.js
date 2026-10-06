import qrcode from 'qrcode-terminal'

/**
 * QR code no terminal
 * @param {string} url
 */
export function showQR(url) {
  qrcode.generate(url, { small: true }, (qr) => {
    const indented = qr
      .split('\n')
      .map((line) => `  ${line}`)
      .join('\n')

    console.log(`\n${indented}\n`)
  })
}
