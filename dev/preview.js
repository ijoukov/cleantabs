const now = Date.now();
const LOCALES = [
  ["en", "English"],
  ["es", "Español"],
  ["es_419", "Español (LatAm)"],
  ["pt_BR", "Português (Brasil)"],
  ["fr", "Français"],
  ["de", "Deutsch"],
  ["ja", "日本語"],
  ["ko", "한국어"],
  ["zh_CN", "中文（简体）"],
  ["zh_TW", "中文（繁體）"],
  ["hi", "हिन्दी"],
  ["id", "Indonesia"],
  ["vi", "Tiếng Việt"],
  ["tr", "Türkçe"],
  ["pl", "Polski"],
  ["uk", "Українська"],
  ["ru", "Русский"]
];
const localeCache = new Map();
let currentLocale = new URLSearchParams(location.search).get("locale") || localStorage.getItem("cleantabs.previewLocale") || "en";

let previewTabs = [
  tab(1, "CleanTabs GitHub repository", "https://github.com/ijoukov/cleantabs", 1, 0, true, 3),
  tab(2, "CleanTabs GitHub repository", "https://github.com/ijoukov/cleantabs", 1, 1, false, 18),
  tab(3, "Chrome Web Store Developer Dashboard", "https://chrome.google.com/webstore/devconsole", 1, 2, false, 92),
  tab(4, "Manifest V3 documentation", "https://developer.chrome.com/docs/extensions/develop/migrate/what-is-mv3", 1, 3, false, 210),
  tab(5, "Manifest V3 documentation", "https://developer.chrome.com/docs/extensions/develop/migrate/what-is-mv3#service-workers", 1, 4, false, 230),
  tab(6, "Extremely long product requirements document that should truncate without breaking the row layout", "https://docs.google.com/document/d/1SOME-LONG-ID/edit#heading=h.very-long-section-name-that-keeps-going", 1, 5, false, 45),
  tab(7, "New Tab", "chrome://newtab/", 1, 6, false, 16),
  tab(8, "Search engine results for chrome extension duplicate tabs", "https://www.google.com/search?q=chrome+extension+duplicate+tabs", 2, 0, false, 7),
  tab(9, "Stack Overflow - Chrome extension permissions", "https://stackoverflow.com/questions/ask", 2, 1, false, 64),
  tab(10, "Inbox", "https://mail.google.com/mail/u/0/#inbox", 2, 2, false, 9)
];

globalThis.cleanTabsPreviewApi = {
  tabs: {
    async query() {
      return previewTabs.map(({ openedMinutesAgo, viewedMinutesAgo, ...item }) => ({ ...item }));
    },
    async remove(tabIds) {
      const ids = new Set(Array.isArray(tabIds) ? tabIds : [tabIds]);
      previewTabs = previewTabs.filter((item) => !ids.has(item.id));
    },
    async update(tabId, changes) {
      previewTabs = previewTabs.map((item) => ({ ...item, active: item.id === tabId ? Boolean(changes.active) : false }));
    }
  },
  windows: {
    async update() {}
  },
  permissions: {
    async contains() {
      return true;
    },
    async request() {
      return true;
    }
  },
  scripting: {
    async executeScript({ target, args }) {
      const tabItem = previewTabs.find((item) => item.id === target.tabId);
      const query = args[0];
      const text = `${tabItem?.title || ""} ${tabItem?.url || ""} release polish performance permissions duplicate tabs}`;
      return [{ result: text.toLowerCase().includes(query) }];
    }
  },
  i18n: {
    getMessage(key) {
      return localeCache.get(currentLocale)?.[key]?.message ||
        localeCache.get("en")?.[key]?.message ||
        "";
    },
    getUILanguage() {
      return currentLocale;
    }
  }
};

document.addEventListener("DOMContentLoaded", initializeLocalePreview);

async function initializeLocalePreview() {
  await Promise.all(LOCALES.map(([locale]) => loadLocale(locale)));
  const select = document.querySelector("#previewLocale");
  select.replaceChildren(...LOCALES.map(([locale, label]) => {
    const option = document.createElement("option");
    option.value = locale;
    option.textContent = label;
    option.selected = locale === currentLocale;
    return option;
  }));

  select.addEventListener("change", () => {
    currentLocale = select.value;
    localStorage.setItem("cleantabs.previewLocale", currentLocale);
    globalThis.cleanTabsPreviewLocalize?.();
    globalThis.cleanTabsPreviewRender?.();
  });

  globalThis.cleanTabsPreviewLocalize?.();
  globalThis.cleanTabsPreviewRender?.();
}

async function loadLocale(locale) {
  if (localeCache.has(locale)) {
    return;
  }
  const response = await fetch(`../_locales/${locale}/messages.json`);
  localeCache.set(locale, await response.json());
}

function tab(id, title, url, windowId, index, active, viewedMinutesAgo) {
  return {
    id,
    title,
    url,
    favIconUrl: faviconFor(url),
    windowId,
    index,
    active,
    lastAccessed: now - viewedMinutesAgo * 60 * 1000,
    viewedMinutesAgo
  };
}

function faviconFor(url) {
  try {
    const { hostname, protocol } = new URL(url);
    if (protocol !== "https:") {
      return "";
    }
    return `https://www.google.com/s2/favicons?domain=${hostname}&sz=32`;
  } catch (_error) {
    return "";
  }
}
