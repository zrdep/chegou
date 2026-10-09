// terminal texts in English

export default {
  meta: { name: 'English', timeLocale: 'en-US' },

  help: `
  usage: chegou [options] [files, folders or links...]

  examples:
    chegou                      # open and wait for files from your phone
    chegou photo.jpg video.mp4  # make these files ready to download on the phone
    chegou ./photos             # every file in a folder
    chegou https://mysite.com   # send a link for the phone to open
    chegou --relay              # use the tunnel (works outside your wi-fi)

  options:
    --relay, --tunnel, -r  Cloudflare tunnel: works from any network (up to 100 MB per file)
    --local, -l            local network, don't ask
    --port, -p <number>    preferred port (default: {port})
    --dir,  -d <path>      where to save incoming files (default: ~/Downloads/chegou)
    --timeout, -t <min>    shut down after X minutes without use
    --lang <language>      terminal language: {langs}
    --help, -h             show this help
`,

  args: {
    needsValue: '{flag} needs a value',
    badPort: 'invalid port: {value} (use a number between 1 and 65535)',
    badTimeout: 'invalid time: {value} (use minutes, e.g. --timeout 10 or --timeout 0.5)',
    badLang: 'invalid language: {value} (available: {langs})',
    unknown: 'unknown option: {flag}',
  },

  errors: {
    prefix: 'error:',
    mkdir: "couldn't create the folder {dir} ({code})",
    listen: "couldn't start the server ({reason})",
    noFreePort: 'no free port between {from} and {to}',
    tunnelNoLan: "couldn't open the tunnel ({reason}) and this PC isn't on any local network",
    tunnelFallback: "couldn't open the tunnel ({reason}), using the local network instead",
  },

  prompt: {
    question: 'how will your phone connect?',
    localName: 'local',
    localHint: 'same wi-fi · faster · no size limit',
    tunnelName: 'tunnel',
    tunnelHint: 'any network · via Cloudflare · up to 100 MB per file',
    noLan: ' no local network',
    keys: '↑↓ choose · enter confirm',
  },

  tunnel: {
    downloading: 'downloading cloudflared (~30 MB, first time only)...',
    opening: 'opening tunnel...',
    waiting: 'waiting for the address to go live...',
    slow: 'Cloudflare took too long to respond',
    noUrl: "Cloudflare didn't return an address",
    failed: "couldn't start cloudflared",
  },

  banner: {
    tunnelTag: '· tunnel',
    waiting: 'waiting for files',
    tunnel: 'tunnel',
    network: 'network',
    local: 'local',
    folder: 'folder',
    token: 'token',
    noNetwork: 'no wi-fi/cable',
    shutsDown: 'stops',
    idleFor: 'after {time} idle',
    tunnelLimit: 'up to 100 MB per file on the tunnel',
    portBusy: 'port {wanted} is busy, using {port}',
    scanTunnel: 'scan the QR · works from any network',
    scan: 'scan the QR with your phone',
    connect: 'connect this PC to a network to use your phone',
    drop: 'drop files here or type a link + Enter',
    quit: 'q + enter or ctrl+c to quit',
    activity: 'activity',
  },

  activity: {
    shared: '(shared)',
    sharedText: '···· shared with phone',
    downloaded: '(downloaded on phone)',
  },

  share: {
    notFound: 'file not found: {path}',
    isFolder: "that's a folder: {path}",
    empty: 'empty text',
    emptyFolder: 'the folder {name} has no files',
    folderLimit: 'the folder {name} has {count} files, only the first {max} were shared',
  },

  upload: {
    fallbackName: 'file',
    noFreeName: "couldn't find a free name for {name}",
  },

  goodbye: {
    idle: 'stopped after being idle ({time})',
    bye: 'see you ·',
    nothing: 'no files received',
    files: { one: '{n} file', other: '{n} files' },
    star: 'enjoyed it? leave a',
  },
}
