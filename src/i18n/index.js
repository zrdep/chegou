// tradução do terminal
//
// pra adicionar um idioma:
//   1. copie src/i18n/en.js pra src/i18n/<código>.js e traduza os textos
//   2. importe e coloque ele em LOCALES aqui embaixo
//   3. faça o mesmo na página do celular: public/i18n/

import en from './en.js'
import pt from './pt.js'

const LOCALES = { pt, en }
const FALLBACK = 'en'

let current = FALLBACK

/**
 * "pt-BR", "pt_BR.UTF-8", "en-US" -> "pt" / "en" (se existir tradução)
 * @param {string | undefined} raw
 * @returns {string | null}
 */
function normalize(raw) {
  const code = String(raw ?? '').toLowerCase().split(/[-_.]/)[0]
  return code in LOCALES ? code : null
}

/**
 * descobre o idioma: --lang > CHEGOU_LANG > variáveis do sistema > idioma do Windows/Mac
 * @param {string} [explicit] valor do --lang
 * @returns {string}
 */
export function detectLang(explicit) {
  const candidates = [
    explicit,
    process.env.CHEGOU_LANG,
    process.env.LC_ALL,
    process.env.LC_MESSAGES,
    process.env.LANG,
    Intl.DateTimeFormat().resolvedOptions().locale,
  ]
  for (const candidate of candidates) {
    const lang = normalize(candidate)
    if (lang) return lang
  }
  return FALLBACK
}

/** @param {string} lang */
export function setLang(lang) {
  current = normalize(lang) ?? FALLBACK
}

export function getLang() {
  return current
}

/** idiomas disponíveis, pra mostrar na ajuda e validar o --lang */
export const availableLangs = Object.keys(LOCALES)

/** locale usado pra formatar hora (16:20) */
export function timeLocale() {
  return LOCALES[current].meta.timeLocale
}

/**
 * busca o texto pela chave ("banner.waiting") e troca {variáveis}
 * plural: se o texto for { one, other } e vars.n existir, escolhe pelo número
 * @param {string} key
 * @param {Record<string, string | number>} [vars]
 * @returns {string}
 */
export function t(key, vars = {}) {
  const lookup = (dict) => key.split('.').reduce((node, part) => node?.[part], dict)
  let text = lookup(LOCALES[current]) ?? lookup(LOCALES[FALLBACK]) ?? key

  if (typeof text === 'object') text = vars.n === 1 ? text.one : text.other

  return String(text).replace(/\{(\w+)\}/g, (_, name) => (name in vars ? String(vars[name]) : `{${name}}`))
}
