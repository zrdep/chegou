// tradução da página do celular
//
// pra adicionar um idioma:
//   1. copie public/i18n/en.js pra public/i18n/<código>.js e traduza os textos
//   2. adicione um <script src="i18n/<código>.js"> no index.html (antes deste arquivo)
//   3. faça o mesmo no terminal: src/i18n/
//
// o idioma vem do celular (navigator.languages). dá pra forçar com ?lang=en na url.

;(() => {
  const LOCALES = window.CHEGOU_LOCALES || {}
  const FALLBACK = 'en'

  const pick = () => {
    const wanted = [new URLSearchParams(location.search).get('lang'), ...(navigator.languages || [navigator.language])]
    for (const raw of wanted) {
      const code = String(raw || '').toLowerCase().split(/[-_]/)[0]
      if (LOCALES[code]) return code
    }
    return FALLBACK
  }

  const lang = pick()
  const lookup = (dict, key) => key.split('.').reduce((node, part) => node?.[part], dict)

  /**
   * busca o texto pela chave ("buttons.send") e troca {variáveis}
   * plural: se o texto for { one, other } e vars.n existir, escolhe pelo número
   */
  function t(key, vars = {}) {
    let text = lookup(LOCALES[lang], key) ?? lookup(LOCALES[FALLBACK], key) ?? key
    if (typeof text === 'object') text = vars.n === 1 ? text.one : text.other
    return String(text).replace(/\{(\w+)\}/g, (_, name) => (name in vars ? String(vars[name]) : `{${name}}`))
  }

  // textos fixos do html: <span data-i18n="sheet.cancel"> e aria-label com data-i18n-aria
  function apply(root = document) {
    root.querySelectorAll('[data-i18n]').forEach((el) => { el.textContent = t(el.dataset.i18n) })
    root.querySelectorAll('[data-i18n-aria]').forEach((el) => el.setAttribute('aria-label', t(el.dataset.i18nAria)))
    document.documentElement.lang = LOCALES[lang].meta.htmlLang
  }

  window.i18n = { t, lang, apply }
  apply()
})()
