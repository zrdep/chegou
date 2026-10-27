// Textos de terminal en español

export default {
  meta: { name: 'Spanish', timeLocale: 'es-ES' },

  help: `
  uso: chegou [opciones] [archivos, carpetas o enlaces...]

  ejemplos:
    chegou                      # Abre y espera por los ficheros desde tu teléfono
    chegou photo.jpg video.mp4  # Deja los ficheros listos para descargar en el teléfono
    chegou ./photos             # Todos los ficheros de una carpeta
    chegou https://mysite.com   # Envía un enlace para abrir en el teléfono
    chegou --relay              # Usa el túnel (funciona fuera de tu wi-fi)
    chegou --open               # Activar/desactivar apertura automática de carpetas (guardado)

  opciones:
    --relay, --tunnel, -r  Túnel de Cloudflare: funciona desde cualquier red (hasta 100 MB por archivo)
    --local, -l            Red local (sin confirmación)
    --port, -p <number>    Puerto preferido (predeterminado: {port})
    --dir,  -d <path>      Dónde guardar los archivos entrantes (por defecto: ~/Downloads/chegou)
    --timeout, -t <min>    Apagar después de X minutos sin uso
    --open [on|off]        Abrir la carpeta al recibir el primer archivo: al marcarse sola cambia de estado y se guarda (por defecto: activado)
    --lang <language>      Idioma del terminal: {langs}
    --help, -h             Muestra esta ayuda
`,

  args: {
    needsValue: '{flag} requiere un valor',
    badPort: 'puerto no válido: {value} (usa un número entre 1 y 65535)',
    badTimeout: 'tiempo no válido: {value} (usa minutos, ej. --timeout 10 o --timeout 0.5)',
    badLang: 'idioma no válido: {value} (disponibles: {langs})',
    unknown: 'opción desconocida: {flag}',
    badOpen: 'valor no válido para --open: {value} (usa on u off)',
  },

  errors: {
    prefix: 'error:',
    mkdir: 'no se pudo crear la carpeta {dir} ({code})',
    listen: 'no se pudo iniciar el servidor ({reason})',
    noFreePort: 'no hay ningún puerto libre entre {from} y {to}',
    tunnelNoLan: 'no se pudo abrir el túnel ({reason}) y este PC no está en ninguna red local',
    tunnelFallback: 'no se pudo abrir el túnel ({reason}), se usará la red local en su lugar',
  },

  prompt: {
    question: '¿cómo se conectará tu teléfono?',
    localName: 'local',
    localHint: 'misma wi-fi · más rápido · sin límite de tamaño',
    tunnelName: 'túnel',
    tunnelHint: 'cualquier red · vía Cloudflare · hasta 100 MB por archivo',
    noLan: ' sin red local',
    keys: '↑↓ elegir · enter confirmar',
  },

  tunnel: {
    downloading: 'descargando cloudflared (~30 MB, solo la primera vez)...',
    opening: 'abriendo túnel...',
    waiting: 'esperando a que la dirección esté activa...',
    slow: 'Cloudflare tardó demasiado en responder',
    noUrl: 'Cloudflare no devolvió ninguna dirección',
    failed: 'no se pudo iniciar cloudflared',
  },

  banner: {
    tunnelTag: '· túnel',
    waiting: 'esperando archivos',
    tunnel: 'túnel',
    network: 'red',
    local: 'local',
    folder: 'carpeta',
    token: 'token',
    noNetwork: 'sin wi-fi/cable',
    shutsDown: 'se detiene',
    idleFor: 'tras {time} de inactividad',
    tunnelLimit: 'hasta 100 MB por archivo en el túnel',
    portBusy: 'el puerto {wanted} está ocupado, usando {port}',
    scanTunnel: 'escanea el QR · funciona desde cualquier red',
    scan: 'escanea el QR con tu teléfono',
    connect: 'conecta este PC a una red para usar tu teléfono',
    drop: 'arrastra archivos aquí o escribe un enlace + Enter',
    quit: 'q + enter o ctrl+c para salir',
    activity: 'actividad',
  },

  activity: {
    opened: 'carpeta abierta · chegou --open desactiva esto',
    shared: '(compartido)',
    sharedText: '···· compartido con el teléfono',
    downloaded: '(descargado en el teléfono)',
  },

  share: {
    notFound: 'archivo no encontrado: {path}',
    isFolder: 'eso es una carpeta: {path}',
    empty: 'texto vacío',
    emptyFolder: 'la carpeta {name} no tiene archivos',
    folderLimit: 'la carpeta {name} tiene {count} archivos, solo se compartieron los primeros {max}',
  },

  upload: {
    fallbackName: 'archivo',
    noFreeName: 'no se pudo encontrar un nombre disponible para {name}',
  },

  update: {
    available: 'nueva versión disponible',
    run: 'para actualizar:',
  },

  open: {
    label: 'abrir carpeta al recibir el 1.er archivo:',
    on: 'activado',
    off: 'desactivado',
    saved: '(guardado para la próxima vez)',
    notSaved: '(solo esta vez, no se pudo guardar)',
  },

  goodbye: {
    idle: 'detenido por inactividad ({time})',
    bye: 'hasta luego ·',
    nothing: 'no se recibieron archivos',
    files: { one: '{n} archivo', other: '{n} archivos' },
    star: '¿te gustó? déjanos una',
  },
}
