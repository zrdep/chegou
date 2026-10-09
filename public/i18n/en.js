// phone page texts in English
window.CHEGOU_LOCALES = window.CHEGOU_LOCALES || {}
window.CHEGOU_LOCALES.en = {
  meta: { htmlLang: 'en' },

  boot: {
    connected: 'connected to your PC',
    ready: '  ready to swap files',
    connectedTunnel: 'connected through the tunnel',
    readyTunnel: '  any network · up to 100 MB',
    hostTunnel: 'chegou · tunnel',
  },

  sections: {
    fromPc: '# from your PC',
    toPc: '# send to your PC',
    empty: '  no files yet',
    camera: '# camera → PC',
    photoToPc: '# photo → PC',
    videoToPc: '# video → PC',
    sending: '# sending',
    progressLabel: 'upload progress',
  },

  buttons: {
    add: '[ + add ]',
    addMore: '[ + add more ]',
    sendOthers: '[ + send more ]',
    send: 'send',
    sendFiles: 'send {files} · {size}',
    sending: 'sending...',
    sent: 'sent ✓',
    retry: 'try again',
  },

  sheet: {
    title: '# add',
    photo: 'photo',
    photoHint: 'take one now',
    video: 'video',
    videoHint: 'record now',
    files: 'files',
    filesHint: 'gallery and folders',
    cancel: 'cancel',
  },

  files: { one: '{n} file', other: '{n} files' },
  progress: '  {done} of {total}{speed}',

  done: {
    arrived: { one: '✓ {n} file arrived on your PC', other: '✓ {n} files arrived on your PC' },
    photo: '✓ photo arrived on your PC',
    video: '✓ video arrived on your PC',
  },

  errors: {
    unauthorized: 'invalid token · scan the QR code again',
    tooLarge: 'file is too large',
    tooLargeTunnel: 'file is over 100 MB, the tunnel limit',
    tunnelLimit: 'over 100 MB, the tunnel limit: {names} · use the local network for this one',
    http: 'error {status} on the PC',
    network: 'connection lost · is chegou still running on the PC?',
    aborted: 'upload cancelled',
    noToken: '! no token in the url · scan the QR code in the terminal',
  },

  pc: {
    download: '[ download ]',
    copy: '[ copy ]',
    copied: 'copied ✓',
    open: '[ open ]',
    copyPrompt: 'Copy the text below:',
    new: '✓ new from PC: {name}',
  },

  star: { text: 'enjoyed it? leave a ', link: '★ on github' },
}
