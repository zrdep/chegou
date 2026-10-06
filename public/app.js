// seleção de arquivos, envio e barra de progresso

const $ = (id) => document.getElementById(id)

const els = {
  host: $('host'),
  input: $('files'),
  pick: $('pick'),
  pickText: $('pick-text'),
  send: $('send'),
  empty: $('empty'),
  list: $('file-list'),
  total: $('total'),
  progressArea: $('progress-area'),
  progress: $('progress'),
  bar: $('progress-bar'),
  pct: $('progress-pct'),
  detail: $('progress-detail'),
  log: $('log'),
}

const cam = {
  input: $('camera'),
  btn: $('camera-btn'),
  btnText: $('camera-btn-text'),
  area: $('camera-area'),
  card: $('camera-card'),
  thumb: $('camera-thumb'),
  name: $('camera-name'),
  fill: $('camera-fill'),
  pct: $('camera-pct'),
  detail: $('camera-detail'),
  progress: $('camera-progress'),
}

// o token vem do QR code: http://192.168.1.15:8080/?t=a8f3k2x9
const token = new URLSearchParams(location.search).get('t') ?? ''

/** @type {File[]} */
let selected = []

/** idle → selecting → sending → done (ou error) */
let state = 'idle'
let cameraBusy = false

// ---------- utilitários ----------

/**
 * 2400000 -> "2.3 MB"
 * @param {number} bytes
 * @returns {string}
 */
function formatSize(bytes) {
  const units = ['B', 'KB', 'MB', 'GB']
  let size = bytes
  let unit = 0

  while (size >= 1024 && unit < units.length - 1) {
    size /= 1024
    unit++
  }

  return `${unit === 0 ? size : size.toFixed(1)} ${units[unit]}`
}

/**
 * @param {number} n
 * @returns {string}
 */
function plural(n) {
  return `${n} ${n === 1 ? 'arquivo' : 'arquivos'}`
}

/**
 * cria um elemento com classe e texto (sem innerHTML: nome de arquivo nunca vira código)
 * @param {string} tag
 * @param {string} className
 * @param {string} text
 * @returns {HTMLElement}
 */
function el(tag, className, text = '') {
  const node = document.createElement(tag)
  if (className) node.className = className
  node.textContent = text
  return node
}

/**
 * escreve uma linha no log
 * @param {string} text
 * @param {string} className
 * @returns {HTMLElement}
 */
function log(text, className = '') {
  const line = el('p', `line ${className}`, text)
  els.log.append(line)
  line.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  return line
}

// ---------- estados ----------

/**
 * troca o estado e ajusta botões/textos
 * @param {'idle' | 'selecting' | 'sending' | 'done' | 'error'} next
 */
function setState(next) {
  state = next
  document.body.dataset.state = next

  const busy = next === 'sending'
  const totalBytes = selected.reduce((sum, file) => sum + file.size, 0)

  els.input.disabled = busy
  els.pick.classList.toggle('is-disabled', busy)
  cam.btn.classList.toggle('is-disabled', busy || cameraBusy)
  cam.input.disabled = busy || cameraBusy
  els.send.disabled = busy || selected.length === 0 || next === 'done'

  els.pickText.textContent =
    next === 'selecting' ? '[ adicionar mais ]'
    : next === 'done' ? '[ mandar outros ]'
    : '[ escolher arquivos ]'

  els.send.textContent =
    busy ? 'enviando...'
    : next === 'done' ? 'enviado ✓'
    : next === 'error' ? 'tentar de novo'
    : selected.length ? `enviar ${plural(selected.length)} · ${formatSize(totalBytes)}`
    : 'enviar'
}

// ---------- lista de arquivos ----------

function renderList() {
  els.list.replaceChildren()

  for (const file of selected) {
    const item = el('li')
    item.append(el('span', 'name', file.name), el('span', 'fill'), el('span', 'size', formatSize(file.size)))
    els.list.append(item)
  }

  const totalBytes = selected.reduce((sum, file) => sum + file.size, 0)
  els.empty.hidden = selected.length > 0
  els.total.hidden = selected.length < 2
  els.total.textContent = `  ${plural(selected.length)} · ${formatSize(totalBytes)}`
}

els.input.addEventListener('change', () => {
  // depois de um envio, começa uma lista nova
  if (state === 'done' || state === 'error') {
    selected = []
    els.log.replaceChildren()
    els.progressArea.hidden = true
  }

  // soma com o que já estava escolhido, sem repetir o mesmo arquivo
  const key = (f) => `${f.name}:${f.size}:${f.lastModified}`
  const known = new Set(selected.map(key))

  for (const file of els.input.files) {
    if (!known.has(key(file))) selected.push(file)
  }

  // limpa o input pra conseguir escolher o mesmo arquivo de novo depois
  els.input.value = ''

  renderList()
  setState(selected.length ? 'selecting' : 'idle')
})

// ---------- barra de progresso ----------

/**
 * atualiza a barra (a animação suave fica por conta do css)
 * @param {number} ratio de 0 a 1
 */
function setProgress(ratio) {
  const percent = Math.floor(Math.min(1, Math.max(0, ratio)) * 100)

  els.bar.style.width = `${percent}%`
  els.pct.textContent = `${percent}%`
  els.progress.setAttribute('aria-valuenow', String(percent))
}

// ---------- envio ----------

/**
 * manda os arquivos com XMLHttpRequest (o fetch ainda não informa progresso de upload)
 * @param {File[]} files
 * @param {(loaded: number, total: number) => void} onProgress
 * @returns {Promise<{ files: { name: string, size: number }[] }>}
 */
function upload(files, onProgress) {
  return new Promise((resolve, reject) => {
    const form = new FormData()
    for (const file of files) form.append('file', file, file.name)

    const xhr = new XMLHttpRequest()
    xhr.open('POST', `/upload?t=${encodeURIComponent(token)}`)
    xhr.responseType = 'json'

    xhr.upload.addEventListener('progress', (event) => {
      if (event.lengthComputable) onProgress(event.loaded, event.total)
    })

    xhr.addEventListener('load', () => {
      const body = xhr.response ?? {}
      if (xhr.status >= 200 && xhr.status < 300) return resolve(body)

      const messages = {
        401: 'token inválido · escaneie o QR code de novo',
        413: body.error ?? 'arquivo grande demais',
      }
      reject(new Error(messages[xhr.status] ?? body.error ?? `erro ${xhr.status} no PC`))
    })

    xhr.addEventListener('error', () => reject(new Error('conexão perdida · o PC ainda está rodando o chegou?')))
    xhr.addEventListener('abort', () => reject(new Error('envio cancelado')))

    xhr.send(form)
  })
}

// avisa antes de fechar a página no meio do envio
window.addEventListener('beforeunload', (event) => {
  if (state === 'sending' || cameraBusy) event.preventDefault()
})

els.send.addEventListener('click', async () => {
  if (!selected.length || state === 'sending') return

  els.log.replaceChildren()
  els.progressArea.hidden = false
  setProgress(0)
  setState('sending')

  const started = performance.now()

  // tenta manter a tela acesa (só funciona em https, então é um bônus)
  const wakeLock = await navigator.wakeLock?.request('screen').catch(() => null)

  try {
    const result = await upload(selected, (loaded, total) => {
      const seconds = (performance.now() - started) / 1000
      const speed = seconds > 0.3 ? ` · ${formatSize(loaded / seconds)}/s` : ''

      setProgress(loaded / total)
      els.detail.textContent = `  ${formatSize(loaded)} de ${formatSize(total)}${speed}`
    })

    setProgress(1)

    // marca cada arquivo com ✓, um depois do outro
    els.list.querySelectorAll('li').forEach((item, i) => {
      item.style.setProperty('--n', String(i))
      item.classList.add('sent')
    })

    const count = result.files?.length ?? selected.length
    log(`✓ ${plural(count)} ${count === 1 ? 'chegou' : 'chegaram'} no PC`, 'ok success')
    setState('done')
  } catch (err) {
    els.list.querySelectorAll('li').forEach((item) => item.classList.add('failed'))
    log(`✗ ${err.message}`, 'err')
    setState('error')
  } finally {
    wakeLock?.release().catch(() => {})
  }
})

// ---------- câmera direta ----------

let cameraUrl = null

function setCameraProgress(ratio) {
  const percent = Math.floor(Math.min(1, Math.max(0, ratio)) * 100)
  cam.fill.style.width = `${percent}%`
  cam.pct.textContent = `${percent}%`
}

cam.input.addEventListener('change', async () => {
  const file = cam.input.files[0]
  if (!file || state === 'sending' || cameraBusy) return

  cam.input.value = ''
  cameraBusy = true

  // preview
  if (cameraUrl) URL.revokeObjectURL(cameraUrl)
  cameraUrl = URL.createObjectURL(file)
  cam.thumb.src = cameraUrl
  cam.name.textContent = file.name
  cam.area.hidden = false
  cam.card.className = 'camera-card camera-flash'
  cam.progress.hidden = false
  cam.detail.className = 'line dim camera-detail'
  cam.detail.textContent = ''
  setCameraProgress(0)

  // lock UI
  els.input.disabled = true
  els.pick.classList.add('is-disabled')
  els.send.disabled = true
  cam.input.disabled = true
  cam.btn.classList.add('is-disabled')
  cam.btnText.textContent = 'enviando...'
  document.body.dataset.state = 'sending'

  const started = performance.now()
  const wakeLock = await navigator.wakeLock?.request('screen').catch(() => null)

  try {
    await upload([file], (loaded, total) => {
      const seconds = (performance.now() - started) / 1000
      const speed = seconds > 0.3 ? ` · ${formatSize(loaded / seconds)}/s` : ''
      setCameraProgress(loaded / total)
      cam.detail.textContent = `  ${formatSize(loaded)} de ${formatSize(total)}${speed}`
    })

    setCameraProgress(1)
    cam.card.className = 'camera-card is-done'
    cam.progress.hidden = true
    cam.detail.className = 'line camera-detail ok'
    cam.detail.textContent = '✓ foto chegou no PC'
    log('✓ foto chegou no PC', 'ok success')

  } catch (err) {
    cam.card.className = 'camera-card is-error'
    cam.progress.hidden = true
    cam.detail.className = 'line camera-detail err'
    cam.detail.textContent = `✗ ${err.message}`
    log(`✗ ${err.message}`, 'err')

  } finally {
    wakeLock?.release().catch(() => {})
    cameraBusy = false
    cam.btnText.textContent = '📸 foto'
    setState(selected.length ? 'selecting' : 'idle')
  }
})

// ---------- início ----------

els.host.textContent = `chegou · ${location.hostname}`

if (!token) {
  log('! sem token na url · escaneie o QR code do terminal', 'warn')
}

setState('idle')
