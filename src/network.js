import { networkInterfaces } from 'node:os'

// interfaces virtuais que o celular nunca vai conseguir alcançar
const IGNORED = /vEthernet|WSL|docker|veth|br-|vmnet|VirtualBox|VMware|Hyper-V|tailscale|zerotier|utun|tun|tap|loopback/i

// interfaces "de verdade": wi-fi e cabo
const PREFERRED = /^(wi-?fi|wlan|wlp|en0|en1|eth|ethernet|enp|eno)/i

/**
 * dá uma nota pro endereço: quanto maior, mais provável ser o IP certo
 * @param {string} name nome da interface
 * @param {string} address endereço IPv4
 * @returns {number}
 */
function score(name, address) {
  let points = 0

  if (PREFERRED.test(name)) points += 10
  if (address.startsWith('192.168.')) points += 3
  else if (address.startsWith('10.')) points += 2
  else if (/^172\.(1[6-9]|2\d|3[01])\./.test(address)) points += 1

  return points
}

/**
 * descobre o IP do PC na rede local
 * @returns {string | null}
 */
export function getLocalIP() {
  const candidates = []

  for (const [name, addresses] of Object.entries(networkInterfaces())) {
    if (IGNORED.test(name)) continue

    for (const info of addresses ?? []) {
      const isIPv4 = info.family === 'IPv4' || info.family === 4
      if (!isIPv4 || info.internal) continue
      if (info.address.startsWith('169.254.')) continue

      candidates.push({ address: info.address, points: score(name, info.address) })
    }
  }

  candidates.sort((a, b) => b.points - a.points)

  return candidates[0]?.address ?? null
}