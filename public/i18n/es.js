// textos de la página del móvil en español
window.CHEGOU_LOCALES = window.CHEGOU_LOCALES || {}
window.CHEGOU_LOCALES.es = {
  meta: { htmlLang: 'es' },

  boot: {
    connected: 'conectado a tu PC',
    ready: '  listo para intercambiar archivos',
    connectedTunnel: 'conectado a través del túnel',
    readyTunnel: '  cualquier red · hasta 100 MB',
    hostTunnel: 'chegou · túnel',
  },

  sections: {
    fromPc: '# desde tu PC',
    toPc: '# enviar a tu PC',
    empty: '  aún no hay archivos',
    camera: '# cámara → PC',
    photoToPc: '# foto → PC',
    videoToPc: '# video → PC',
    sending: '# enviando',
    progressLabel: 'progreso de subida',
  },

  buttons: {
    add: '[ + añadir ]',
    addMore: '[ + añadir más ]',
    sendOthers: '[ + enviar más ]',
    send: 'enviar',
    sendFiles: 'enviar {files} · {size}',
    sending: 'enviando...',
    sent: 'enviado ✓',
    retry: 'reintentar',
  },

  sheet: {
    title: '# añadir',
    photo: 'foto',
    photoHint: 'tomar una ahora',
    video: 'video',
    videoHint: 'grabar ahora',
    files: 'archivos',
    filesHint: 'galería y carpetas',
    cancel: 'cancelar',
  },

  files: { one: '{n} archivo', other: '{n} archivos' },
  progress: '  {done} de {total}{speed}',

  done: {
    arrived: { one: '✓ {n} archivo llegó a tu PC', other: '✓ {n} archivos llegaron a tu PC' },
    photo: '✓ la foto llegó a tu PC',
    video: '✓ el video llegó a tu PC',
    partial: '✓ {sent} de {total} archivos llegaron a tu PC',
  },

  errors: {
    unauthorized: 'token no válido · escanea el código QR de nuevo',
    tooLarge: 'el archivo es demasiado grande',
    tooLargeTunnel: 'el archivo supera los 100 MB, el límite del túnel',
    tunnelLimit: 'supera los 100 MB, el límite del túnel: {names} · usa la red local para este archivo',
    http: 'error {status} en el PC',
    network: 'conexión perdida · ¿sigue ejecutándose chegou en el PC?',
    aborted: 'subida cancelada',
    more: '✗ y {n} más con error',
    noToken: '! no hay token en la url · escanea el código QR en la terminal',
  },

  pc: {
    download: '[ descargar ]',
    copy: '[ copiar ]',
    copied: 'copiado ✓',
    open: '[ abrir ]',
    copyPrompt: 'Copia el siguiente texto:',
    new: '✓ nuevo desde el PC: {name}',
  },

  star: { text: '¿te gustó? déjanos una ', link: '★ en github' },
}
