const TAB_META_KEY = "tabMeta";
let metadataQueue = Promise.resolve();

function runSafely(task) {
  task().catch((error) => {
    console.error("CleanTabs background task failed:", error);
  });
}

async function getTabMeta() {
  const result = await chrome.storage.local.get(TAB_META_KEY);
  return result[TAB_META_KEY] || {};
}

async function setTabMeta(meta) {
  await chrome.storage.local.set({ [TAB_META_KEY]: meta });
}

function updateTabMeta(mutator) {
  metadataQueue = metadataQueue
    .catch(() => {})
    .then(async () => {
      const meta = await getTabMeta();
      await mutator(meta);
      await setTabMeta(meta);
    });
  return metadataQueue;
}

async function ensureCurrentTabs() {
  const tabs = await chrome.tabs.query({});
  const now = Date.now();
  const currentIds = new Set(tabs.map((tab) => String(tab.id)));

  await updateTabMeta(async (meta) => {
    for (const tab of tabs) {
      const key = String(tab.id);
      if (!meta[key]) {
        meta[key] = { openedAt: now, lastViewedAt: tab.active ? now : 0 };
      }
    }

    for (const key of Object.keys(meta)) {
      if (!currentIds.has(key)) {
        delete meta[key];
      }
    }
  });
}

chrome.runtime.onInstalled.addListener(() => {
  runSafely(ensureCurrentTabs);
});

chrome.runtime.onStartup.addListener(() => {
  runSafely(ensureCurrentTabs);
});

chrome.tabs.onCreated.addListener((tab) => {
  runSafely(() => updateTabMeta(async (meta) => {
    meta[String(tab.id)] = {
      openedAt: Date.now(),
      lastViewedAt: tab.active ? Date.now() : 0
    };
  }));
});

chrome.tabs.onActivated.addListener(({ tabId }) => {
  runSafely(() => updateTabMeta(async (meta) => {
    const key = String(tabId);
    meta[key] = {
      ...(meta[key] || { openedAt: Date.now() }),
      lastViewedAt: Date.now()
    };
  }));
});

chrome.tabs.onRemoved.addListener((tabId) => {
  runSafely(() => updateTabMeta(async (meta) => {
    delete meta[String(tabId)];
  }));
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type !== "getTabMeta") {
    return false;
  }

  (async () => {
    try {
      await ensureCurrentTabs();
      sendResponse({ tabMeta: await getTabMeta() });
    } catch (error) {
      console.error("CleanTabs could not load tab metadata:", error);
      sendResponse({ tabMeta: {} });
    }
  })();

  return true;
});
