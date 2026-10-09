// valores fixos do chegou num lugar só: mudou aqui, muda em tudo

import { homedir } from 'node:os'
import { join } from 'node:path'

export const REPO_URL = 'github.com/zrdep/chegou'

// rede local
export const DEFAULT_PORT = 8080
export const PORT_ATTEMPTS = 20
export const DEFAULT_DIR = join(homedir(), 'Downloads', 'chegou')

// tamanho do token: curto na rede local (cabe no QR e dá pra digitar), longo no túnel (url pública)
export const TOKEN_BYTES = { local: 4, tunnel: 8 }

// uploads
export const MAX_FILE_SIZE = 10 * 1024 ** 3 // 10 GB por arquivo
export const MAX_FOLDER_FILES = 200 // ao arrastar uma pasta

// túnel (Cloudflare Quick Tunnel): limite de corpo por requisição no plano gratuito
export const RELAY_MAX_BYTES = 100 * 1024 * 1024

// eventos em tempo real (PC -> celular)
export const SSE_HEARTBEAT_MS = 15_000
