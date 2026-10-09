// textos da página do celular em português
window.CHEGOU_LOCALES = window.CHEGOU_LOCALES || {}
window.CHEGOU_LOCALES.pt = {
  meta: { htmlLang: 'pt-BR' },

  boot: {
    connected: 'conectado ao PC',
    ready: '  pronto pra trocar arquivos',
    connectedTunnel: 'conectado pelo túnel',
    readyTunnel: '  qualquer rede · até 100 MB',
    hostTunnel: 'chegou · túnel',
  },

  sections: {
    fromPc: '# do PC → você',
    toPc: '# enviar para o PC',
    empty: '  nenhum arquivo ainda',
    camera: '# câmera → PC',
    photoToPc: '# foto → PC',
    videoToPc: '# vídeo → PC',
    sending: '# enviando',
    progressLabel: 'progresso do envio',
  },

  buttons: {
    add: '[ + adicionar ]',
    addMore: '[ + adicionar mais ]',
    sendOthers: '[ + mandar outros ]',
    send: 'enviar',
    sendFiles: 'enviar {files} · {size}',
    sending: 'enviando...',
    sent: 'enviado ✓',
    retry: 'tentar de novo',
  },

  sheet: {
    title: '# adicionar',
    photo: 'foto',
    photoHint: 'tirar agora',
    video: 'vídeo',
    videoHint: 'gravar agora',
    files: 'arquivos',
    filesHint: 'galeria e pastas',
    cancel: 'cancelar',
  },

  files: { one: '{n} arquivo', other: '{n} arquivos' },
  progress: '  {done} de {total}{speed}',

  done: {
    arrived: { one: '✓ {n} arquivo chegou no PC', other: '✓ {n} arquivos chegaram no PC' },
    photo: '✓ foto chegou no PC',
    video: '✓ vídeo chegou no PC',
  },

  errors: {
    unauthorized: 'token inválido · escaneie o QR code de novo',
    tooLarge: 'arquivo grande demais',
    tooLargeTunnel: 'arquivo passou de 100 MB, o limite do túnel',
    tunnelLimit: 'passa de 100 MB, o limite do túnel: {names} · use a rede local pra esse',
    http: 'erro {status} no PC',
    network: 'conexão perdida · o PC ainda está rodando o chegou?',
    aborted: 'envio cancelado',
    noToken: '! sem token na url · escaneie o QR code do terminal',
  },

  pc: {
    download: '[ baixar ]',
    copy: '[ copiar ]',
    copied: 'copiado ✓',
    open: '[ abrir ]',
    copyPrompt: 'Copie o texto abaixo:',
    new: '✓ novo do PC: {name}',
  },

  star: { text: 'curtiu? deixa uma ', link: '★ no github' },
}
