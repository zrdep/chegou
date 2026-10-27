// Textos de terminal en español

export default {
  meta: { name: 'español', timeLocale: 'es-ES' },

  help: `
  uso: chegou [opciones] [archivos, carpetas o enlaces...]

  ejemplos:
    chegou                      # se abre y espera archivos desde tu teléfono
    chegou photo.jpg video.mp4  # deja estos archivos listos para descargar en el teléfono
    chegou ./photos             # todos los archivos de una carpeta
    chegou https://mysite.com   # envía un enlace para abrir en el teléfono
    chegou --relay              # usa el túnel (funciona fuera de tu wi-fi)
    chegou --open               # activa/desactiva abrir la carpeta (se guarda)

  opciones:
    --relay, --tunnel, -r  túnel de Cloudflare: funciona desde cualquier red (hasta 100 MB por archivo)
    --local, -l            red local, sin preguntar
    --port, -p <número>    puerto preferido (por defecto: {port})
    --dir,  -d <ruta>      dónde guardar los archivos recibidos (por defecto: ~/Downloads/chegou)
    --timeout, -t <min>    se cierra tras X minutos sin uso
    --open [on|off]        abre la carpeta cuando llega el 1.er archivo: sin valor alterna, y se guarda (por defecto: on)
    --lang <idioma>        idioma del terminal: {langs}
    --help, -h             muestra esta ayuda
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
    notice: 'el túnel usa cloudflared, de Cloudflare: al usarlo aceptas los términos en cloudflare.com/terms',
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

  problem: {
    unauthorized: 'acceso con un token incorrecto ({ip})',
    tooLarge: 'demasiado grande, no se guardó: {name}',
    failed: 'falló el envío: {name} ({reason})',
    failedNoName: 'falló el envío ({reason})',
    aborted: 'envío interrumpido a la mitad: {name}',
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
