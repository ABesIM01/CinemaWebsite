(() => {
  window.cinemaI18n = { t: (text) => text, translate: (text) => text };
  const dictionaryUrl = new URL("../data/i18n.json", document.currentScript.src);
  fetch(dictionaryUrl)
    .then((response) => {
      if (!response.ok) throw new Error(`Translation file request failed: ${response.status}`);
      return response.json();
    })
    .then(({ messages }) => initialize(messages || {}))
    .catch((error) => {
      console.warn("Could not load assets/data/i18n.json; keeping the default language.", error);
      initialize({});
    });

  function initialize(messages) {
  const normalize = (text) => text.replace(/\s+/g, " ").trim();
  const entries = Object.entries(messages).sort((a, b) => b[0].length - a[0].length);
  const reverse = new Map();
  entries.forEach(([source, locales]) => {
    reverse.set(normalize(locales.uk), source);
    reverse.set(normalize(locales.en), source);
  });
  const patterns = entries.map(([source, locales]) => [new RegExp(`(?<![\\p{L}])${source.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?![\\p{L}])`, "gu"), source, locales]);
  const cache = new Map();
  let language = document.documentElement.lang === "en" ? "en" : "uk";
  function translate(text, targetLanguage = language) {
    const key = normalize(text);
    const cacheKey = `${targetLanguage}:${key}`;
    let result = cache.get(cacheKey);
    const source = messages[key] ? key : reverse.get(key);
    if (result === undefined && source) result = messages[source][targetLanguage] || source;
    if (result === undefined) {
      result = key;
      for (const [pattern, sourceText, locales] of patterns) result = result.replace(pattern, locales[targetLanguage] || sourceText);
    }
    cache.set(cacheKey, result);
    return text.match(/^\s*/)[0] + result + text.match(/\s*$/)[0];
  }
  window.cinemaI18n = { t: (text) => translate(text, language), translate };
  if (!document.body) return;
  const originals = new WeakMap();
  const attributes = ["aria-label", "aria-roledescription", "title", "placeholder", "alt", "content"];
  function renderValue(node, key, value, write) {
    const values = originals.get(node) || {};
    let state = values[key];
    if (!state || state.last !== value) {
      let original = reverse.get(normalize(value)) || value;
      // New labels may include a movie title copied from the English page.
      if (/[а-яіїєґ]/i.test(original)) {
        ["Dune: Part Two", "Interstellar", "Inside Out 2", "The Batman", "Avatar: The Way of Water", "The Grand Budapest Hotel"].forEach((title) => {
          original = original.replaceAll(title, reverse.get(title));
        });
      }
      state = { original };
      values[key] = state;
      originals.set(node, values);
    }
    const next = translate(state.original, language);
    if (value !== next) write(next);
    state.last = next;
  }
  const observer = new MutationObserver(() => render());
  function render() {
    observer.disconnect();
    const walker = document.createTreeWalker(document.documentElement, NodeFilter.SHOW_TEXT);
    let node;
    while ((node = walker.nextNode())) {
      if (!node.parentElement || node.parentElement.closest('script, style, svg, [data-no-translate], dd[lang="en"]')) continue;
      if (!node.nodeValue.trim()) continue;
      renderValue(node, "text", node.nodeValue, (value) => { node.nodeValue = value; });
    }
    document.querySelectorAll("*").forEach((element) => {
      if (element.closest("[data-no-translate]")) return;
      attributes.forEach((attribute) => {
        if (element.hasAttribute(attribute)) {
          renderValue(element, attribute, element.getAttribute(attribute), (value) => element.setAttribute(attribute, value));
        }
      });
    });
    observer.observe(document.documentElement, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: attributes });
  }
  const toggle = document.querySelector(".language-toggle");
  function setLanguage(value) {
    language = value === "en" ? "en" : "uk";
    cache.clear();
    document.documentElement.lang = language;
    toggle.setAttribute("aria-checked", String(language === "en"));
    toggle.querySelector(".language-thumb").textContent = language === "en" ? "EN" : "UA";
    toggle.title = language === "en" ? "Увімкнути українську мову" : "Увімкнути англійську мову";
    render();
    document.dispatchEvent(new CustomEvent("cinema-language-change", { detail: language }));
  }
  toggle.addEventListener("click", () => {
    setLanguage(language === "en" ? "uk" : "en");
    try { localStorage.setItem("cinema-language", language); } catch { /* Optional storage. */ }
  });
  window.addEventListener("storage", (event) => {
    if (event.key === "cinema-language" || event.key === null) {
      try { setLanguage(localStorage.getItem("cinema-language")); } catch { setLanguage("uk"); }
    }
  });
  setLanguage(language);
  }
})();
