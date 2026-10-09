// seleção de arquivos, envio e barra de progresso
// os textos vêm de public/i18n/ (t = tradução no idioma do celular)

const { t } = window.i18n
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
  pcArea: $('pc-area'),
  pcList: $('pc-list'),
  add: $('add'),
  sheet: $('sheet'),
  veil: $('sheet-veil'),
  cancel: $('sheet-cancel'),
}

const media = {
  photoInput: $('camera'),
  photoBtn: $('camera-btn'),
  photoBtnText: $('camera-btn-text'),
  videoInput: $('camera-video'),
  videoBtn: $('video-btn'),
  videoBtnText: $('video-btn-text'),
  area: $('camera-area'),
  title: $('camera-title'),
  card: $('camera-card'),
  thumb: $('camera-thumb'),
  videoThumb: $('camera-video-thumb'),
  name: $('camera-name'),
  fill: $('camera-fill'),
  pct: $('camera-pct'),
  detail: $('camera-detail'),
  progress: $('camera-progress'),
}

// o token vem do QR code: http://192.168.1.15:8080/?t=a8f3k2x9
const token = new URLSearchParams(location.search).get('t') ?? ''

// pelo túnel do Cloudflare cada requisição pode ter no máximo 100 MB
const isRelay = location.hostname.endsWith('.trycloudflare.com')
const RELAY_MAX_BYTES = 100 * 1024 * 1024 - 64 * 1024 // folga pro cabeçalho do multipart
const REPO_URL = 'https://github.com/zrdep/chegou'

/** @type {File[]} */
let selected = []

/** idle → selecting → sending → done (ou error) */
let state = 'idle'
let mediaBusy = false

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
  return t('files', { n })
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
  els.add.disabled = busy
  media.photoBtn.classList.toggle('is-disabled', busy || mediaBusy)
  media.photoInput.disabled = busy || mediaBusy
  media.videoBtn.classList.toggle('is-disabled', busy || mediaBusy)
  media.videoInput.disabled = busy || mediaBusy
  els.send.disabled = busy || selected.length === 0 || next === 'done'

  els.pickText.textContent =
    next === 'selecting' ? t('buttons.addMore')
    : next === 'done' ? t('buttons.sendOthers')
    : t('buttons.add')

  els.send.textContent =
    busy ? t('buttons.sending')
    : next === 'done' ? t('buttons.sent')
    : next === 'error' ? t('buttons.retry')
    : selected.length ? t('buttons.sendFiles', { files: plural(selected.length), size: formatSize(totalBytes) })
    : t('buttons.send')
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

      // o PC responde com um código; a mensagem sai no idioma do celular
      const messages = {
        401: t('errors.unauthorized'),
        413: isRelay ? t('errors.tooLargeTunnel') : t('errors.tooLarge'),
      }
      reject(new Error(messages[xhr.status] ?? t('errors.http', { status: xhr.status })))
    })

    xhr.addEventListener('error', () => reject(new Error(t('errors.network'))))
    xhr.addEventListener('abort', () => reject(new Error(t('errors.aborted'))))

    xhr.send(form)
  })
}

/**
 * na rede local manda tudo de uma vez; no túnel, um arquivo por requisição
 * (o limite de 100 MB é por requisição) e recusa antes quem passar do limite
 * @param {File[]} files
 * @param {(loaded: number, total: number) => void} onProgress
 * @returns {Promise<{ files: { name: string, size: number }[] }>}
 */
async function uploadSmart(files, onProgress) {
  if (!isRelay) return upload(files, onProgress)

  const tooBig = files.filter((file) => file.size > RELAY_MAX_BYTES)
  if (tooBig.length) {
    const names = tooBig.map((file) => `${file.name} (${formatSize(file.size)})`).join(', ')
    const err = new Error(t('errors.tunnelLimit', { names }))
    err.beforeUpload = true
    throw err
  }

  const total = files.reduce((sum, file) => sum + file.size, 0)
  const saved = []
  let done = 0

  for (const file of files) {
    const result = await upload([file], (loaded) => onProgress(done + Math.min(loaded, file.size), total))
    saved.push(...(result.files ?? []))
    done += file.size
  }

  return { files: saved }
}

/**
 * depois do primeiro envio que deu certo, uma linha discreta pedindo estrela
 * (só uma vez por visita, pra não encher o saco)
 */
let starShown = false
function showStar() {
  if (starShown) return
  starShown = true

  const line = el('p', 'line dim star', t('star.text'))
  const link = el('a', '', t('star.link'))
  link.href = REPO_URL
  link.target = '_blank'
  link.rel = 'noopener'
  line.append(link)
  els.log.append(line)
  line.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
}

// avisa antes de fechar a página no meio do envio
window.addEventListener('beforeunload', (event) => {
  if (state === 'sending' || mediaBusy) event.preventDefault()
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
    const result = await uploadSmart(selected, (loaded, total) => {
      const seconds = (performance.now() - started) / 1000
      const speed = seconds > 0.3 ? ` · ${formatSize(loaded / seconds)}/s` : ''

      setProgress(loaded / total)
      els.detail.textContent = t('progress', { done: formatSize(loaded), total: formatSize(total), speed })
    })

    setProgress(1)

    // marca cada arquivo com ✓, um depois do outro
    els.list.querySelectorAll('li').forEach((item, i) => {
      item.style.setProperty('--n', String(i))
      item.classList.add('sent')
    })

    const count = result.files?.length ?? selected.length
    log(t('done.arrived', { n: count }), 'ok success')
    showStar()
    setState('done')
  } catch (err) {
    if (err.beforeUpload) els.progressArea.hidden = true
    els.list.querySelectorAll('li').forEach((item) => item.classList.add('failed'))
    log(`✗ ${err.message}`, 'err')
    setState('error')
  } finally {
    wakeLock?.release().catch(() => {})
  }
})

// ---------- câmera e vídeo direto ----------

let mediaUrl = null

function setMediaProgress(ratio) {
  const percent = Math.floor(Math.min(1, Math.max(0, ratio)) * 100)
  media.fill.style.width = `${percent}%`
  media.pct.textContent = `${percent}%`
}

/**
 * envia foto ou vídeo capturado direto da câmera pro PC
 * @param {File} file
 * @param {'photo' | 'video'} kind
 */
async function handleDirectMedia(file, kind) {
  if (!file || state === 'sending' || mediaBusy) return

  // garante extensão correta caso o celular mande nome genérico sem extensão
  let filename = file.name || (kind === 'video' ? 'video' : 'foto')
  if (!filename.includes('.')) {
    if (file.type === 'video/mp4') filename += '.mp4'
    else if (file.type === 'video/quicktime') filename += '.mov'
    else if (file.type === 'video/webm') filename += '.webm'
    else if (file.type === 'image/jpeg') filename += '.jpg'
    else if (file.type === 'image/png') filename += '.png'
    else if (kind === 'video') filename += '.mp4'
    else filename += '.jpg'
  }

  const uploadFile = filename !== file.name
    ? new File([file], filename, { type: file.type || (kind === 'video' ? 'video/mp4' : 'image/jpeg') })
    : file

  mediaBusy = true

  // preview
  if (mediaUrl) URL.revokeObjectURL(mediaUrl)
  mediaUrl = URL.createObjectURL(uploadFile)

  const isVideo = kind === 'video' || uploadFile.type.startsWith('video/')
  if (isVideo) {
    media.thumb.hidden = true
    media.videoThumb.hidden = false
    media.videoThumb.src = mediaUrl
    media.videoThumb.play().catch(() => {})
    media.title.textContent = t('sections.videoToPc')
  } else {
    media.videoThumb.hidden = true
    media.videoThumb.pause?.()
    media.thumb.hidden = false
    media.thumb.src = mediaUrl
    media.title.textContent = t('sections.photoToPc')
  }

  media.name.textContent = uploadFile.name
  media.area.hidden = false
  media.card.className = 'camera-card camera-flash'
  media.progress.hidden = false
  media.detail.className = 'line dim camera-detail'
  media.detail.textContent = ''
  setMediaProgress(0)

  // trava os controles durante o envio
  els.input.disabled = true
  els.pick.classList.add('is-disabled')
  els.send.disabled = true
  media.photoInput.disabled = true
  media.photoBtn.classList.add('is-disabled')
  media.videoInput.disabled = true
  media.videoBtn.classList.add('is-disabled')

  if (isVideo) {
    media.videoBtnText.textContent = t('buttons.sending')
  } else {
    media.photoBtnText.textContent = t('buttons.sending')
  }
  document.body.dataset.state = 'sending'

  const started = performance.now()
  const wakeLock = await navigator.wakeLock?.request('screen').catch(() => null)
  const doneText = isVideo ? t('done.video') : t('done.photo')

  try {
    await uploadSmart([uploadFile], (loaded, total) => {
      const seconds = (performance.now() - started) / 1000
      const speed = seconds > 0.3 ? ` · ${formatSize(loaded / seconds)}/s` : ''
      setMediaProgress(loaded / total)
      media.detail.textContent = t('progress', { done: formatSize(loaded), total: formatSize(total), speed })
    })

    setMediaProgress(1)
    media.card.className = 'camera-card is-done'
    media.progress.hidden = true
    media.detail.className = 'line camera-detail ok'
    media.detail.textContent = doneText
    log(doneText, 'ok success')
    showStar()

  } catch (err) {
    media.card.className = 'camera-card is-error'
    media.progress.hidden = true
    media.detail.className = 'line camera-detail err'
    media.detail.textContent = `✗ ${err.message}`
    log(`✗ ${err.message}`, 'err')

  } finally {
    wakeLock?.release().catch(() => {})
    mediaBusy = false
    media.photoBtnText.textContent = t('sheet.photo')
    media.videoBtnText.textContent = t('sheet.video')
    media.photoInput.value = ''
    media.videoInput.value = ''
    setState(selected.length ? 'selecting' : 'idle')
  }
}

media.photoInput.addEventListener('change', () => {
  const file = media.photoInput.files[0]
  if (file) handleDirectMedia(file, 'photo')
})

media.videoInput.addEventListener('change', () => {
  const file = media.videoInput.files[0]
  if (file) handleDirectMedia(file, 'video')
})

// ---------- menu "adicionar" ----------

function openSheet() {
  els.sheet.hidden = false
  els.veil.hidden = false
  // espera um frame pra animação de subida rodar
  requestAnimationFrame(() => document.body.classList.add('sheet-open'))
}

function closeSheet() {
  document.body.classList.remove('sheet-open')
  setTimeout(() => {
    els.sheet.hidden = true
    els.veil.hidden = true
  }, 200)
}

els.add.addEventListener('click', openSheet)
els.veil.addEventListener('click', closeSheet)
els.cancel.addEventListener('click', closeSheet)

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && !els.sheet.hidden) closeSheet()
})

// escolheu algo (ou abriu a câmera): fecha o menu
for (const input of [els.input, media.photoInput, media.videoInput]) {
  input.addEventListener('click', () => setTimeout(closeSheet, 300))
}

// ---------- itens do PC para você ----------

function renderPcItem(item, isNew = false) {
  const li = el('li', `pc-item ${isNew ? 'pc-flash' : ''}`)
  li.id = `pc-item-${item.id}`

  const info = el('div', 'pc-item-info')

  if (item.type === 'file') {
    const header = el('div', 'pc-item-header')
    header.append(
      el('span', 'pc-item-name', item.name),
      el('span', 'pc-item-size', formatSize(item.size ?? 0))
    )
    info.append(header)

    const actions = el('div', 'pc-item-actions')
    const downloadLink = document.createElement('a')
    downloadLink.className = 'btn-pc-action btn-pc-download'
    downloadLink.href = item.downloadUrl || `/download/${item.id}?t=${encodeURIComponent(token)}`
    downloadLink.download = item.name
    downloadLink.textContent = t('pc.download')
    actions.append(downloadLink)

    li.append(info, actions)
  } else {
    const textSpan = el('span', 'pc-item-text', item.content)
    info.append(textSpan)

    const actions = el('div', 'pc-item-actions')

    const copyBtn = document.createElement('button')
    copyBtn.type = 'button'
    copyBtn.className = 'btn-pc-action btn-pc-copy'
    copyBtn.textContent = t('pc.copy')
    copyBtn.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(item.content)
        copyBtn.textContent = t('pc.copied')
        setTimeout(() => { copyBtn.textContent = t('pc.copy') }, 2000)
      } catch {
        prompt(t('pc.copyPrompt'), item.content)
      }
    })
    actions.append(copyBtn)

    if (item.isUrl) {
      const openLink = document.createElement('a')
      openLink.className = 'btn-pc-action btn-pc-open'
      openLink.href = item.content
      openLink.target = '_blank'
      openLink.rel = 'noopener noreferrer'
      openLink.textContent = t('pc.open')
      actions.append(openLink)
    }

    li.append(info, actions)
  }

  return li
}

let sse = null

function initPcStream() {
  if (!token) return

  sse?.close()
  sse = new EventSource(`/events?t=${encodeURIComponent(token)}`)

  sse.addEventListener('init', (e) => {
    try {
      const items = JSON.parse(e.data)
      els.pcList.replaceChildren()
      if (items.length) {
        els.pcArea.hidden = false
        for (const item of items) {
          els.pcList.append(renderPcItem(item))
        }
      } else {
        els.pcArea.hidden = true
      }
    } catch {}
  })

  sse.addEventListener('item', (e) => {
    try {
      const item = JSON.parse(e.data)
      els.pcArea.hidden = false
      const node = renderPcItem(item, true)
      els.pcList.prepend(node)

      const label = item.type === 'file' ? item.name : item.content
      const short = label.length > 25 ? `${label.slice(0, 24)}…` : label
      log(t('pc.new', { name: short }), 'ok success')
      navigator.vibrate?.(80)
    } catch {}
  })

  sse.addEventListener('error', () => {
    // o EventSource tenta de novo sozinho; se desistir (CLOSED), a gente reabre
    if (sse.readyState === EventSource.CLOSED) setTimeout(initPcStream, 2000)
  })
}

// celular bloqueou a tela ou trocou de app: a conexão costuma cair calada.
// ao voltar pra página, reabre na hora e recebe tudo que chegou enquanto isso
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') initPcStream()
})
window.addEventListener('online', () => initPcStream())

// ---------- início ----------

els.host.textContent = isRelay ? t('boot.hostTunnel') : `chegou · ${location.hostname}`

if (isRelay) {
  $('connected-status').textContent = t('boot.connectedTunnel')
  $('connected-sub').textContent = t('boot.readyTunnel')
}

if (!token) {
  log(t('errors.noToken'), 'warn')
} else {
  initPcStream()
}

setState('idle')

