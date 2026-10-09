// textos do terminal em português

export default {
  meta: { name: 'português', timeLocale: 'pt-BR' },

  help: `
  uso: chegou [opções] [arquivos, pastas ou links...]

  exemplos:
    chegou                      # abre e espera arquivos do celular
    chegou foto.jpg video.mp4   # deixa esses arquivos prontos pro celular baixar
    chegou ./fotos              # todos os arquivos de uma pasta
    chegou https://meusite.com  # manda um link pro celular abrir
    chegou --relay              # usa o túnel (funciona fora do wi-fi)

  opções:
    --relay, --tunnel, -r  túnel Cloudflare: funciona de qualquer rede (até 100 MB por arquivo)
    --local, -l            rede local, sem perguntar
    --port, -p <número>    porta preferida (padrão: {port})
    --dir,  -d <caminho>   onde salvar o que chega (padrão: ~/Downloads/chegou)
    --timeout, -t <min>    desliga sozinho depois de X minutos sem uso
    --lang <idioma>        idioma do terminal: {langs}
    --help, -h             mostra esta ajuda
`,

  args: {
    needsValue: '{flag} precisa de um valor',
    badPort: 'porta inválida: {value} (use um número entre 1 e 65535)',
    badTimeout: 'tempo inválido: {value} (use minutos, ex: --timeout 10 ou --timeout 0.5)',
    badLang: 'idioma inválido: {value} (disponíveis: {langs})',
    unknown: 'opção desconhecida: {flag}',
  },

  errors: {
    prefix: 'erro:',
    mkdir: 'não consegui criar a pasta {dir} ({code})',
    listen: 'não consegui iniciar o servidor ({reason})',
    noFreePort: 'nenhuma porta livre entre {from} e {to}',
    tunnelNoLan: 'não consegui abrir o túnel ({reason}) e o PC não está em nenhuma rede local',
    tunnelFallback: 'não consegui abrir o túnel ({reason}), seguindo na rede local',
  },

  prompt: {
    question: 'como o celular vai se conectar?',
    localName: 'rede local',
    localHint: 'mesmo wi-fi · mais rápido · sem limite',
    tunnelName: 'túnel',
    tunnelHint: 'qualquer rede · via Cloudflare · até 100 MB por arquivo',
    noLan: ' sem rede local',
    keys: '↑↓ escolher · enter confirmar',
  },

  tunnel: {
    downloading: 'baixando o cloudflared (~30 MB, só na primeira vez)...',
    opening: 'abrindo túnel...',
    waiting: 'esperando o endereço ficar no ar...',
    slow: 'o Cloudflare demorou demais pra responder',
    noUrl: 'o Cloudflare não devolveu um endereço',
    failed: 'não foi possível iniciar o cloudflared',
  },

  banner: {
    tunnelTag: '· túnel',
    waiting: 'esperando arquivos',
    tunnel: 'túnel',
    network: 'rede',
    local: 'local',
    folder: 'pasta',
    token: 'token',
    noNetwork: 'sem wi-fi/cabo',
    shutsDown: 'desliga',
    idleFor: '{time} sem uso',
    tunnelLimit: 'até 100 MB por arquivo no túnel',
    portBusy: 'porta {wanted} ocupada, usando {port}',
    scanTunnel: 'escaneie o QR · funciona de qualquer rede',
    scan: 'escaneie o QR com o celular',
    connect: 'conecte o PC na rede pra usar no celular',
    drop: 'arraste arquivos aqui ou digite link + Enter',
    quit: 'q + enter ou ctrl+c para sair',
    activity: 'atividade',
  },

  activity: {
    shared: '(compartilhado)',
    sharedText: '···· compartilhado com celular',
    downloaded: '(baixado no celular)',
  },

  share: {
    notFound: 'arquivo não encontrado: {path}',
    isFolder: 'isso é uma pasta: {path}',
    empty: 'texto vazio',
    emptyFolder: 'a pasta {name} não tem arquivos',
    folderLimit: 'a pasta {name} tem {count} arquivos, mandei só os {max} primeiros',
  },

  upload: {
    fallbackName: 'arquivo',
    noFreeName: 'não consegui um nome livre para {name}',
  },

  goodbye: {
    idle: 'desligado por inatividade ({time} sem uso)',
    bye: 'até mais ·',
    nothing: 'nenhum arquivo recebido',
    files: { one: '{n} arquivo', other: '{n} arquivos' },
    star: 'curtiu? deixa uma',
  },
}
