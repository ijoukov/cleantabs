const NEW_TAB_URLS = new Set([
  "chrome://newtab/",
  "chrome://new-tab-page/",
  "edge://newtab/",
  "about:newtab"
]);
const CONTENT_SEARCH_CONCURRENCY = 4;
const tabApi = globalThis.cleanTabsPreviewApi || chrome;
const DEFAULT_MESSAGES = {
  appName: "CleanTabs",
  loadingTabs: "Loading tabs...",
  refresh: "Refresh",
  tabFiltersLabel: "Tab filters",
  urlOrTitleLabel: "URL or title",
  searchUrlOrTitlePlaceholder: "Search URL or title",
  pageTextLabel: "Page text",
  searchLoadedPageTextPlaceholder: "Search loaded page text",
  search: "Search",
  searching: "Searching",
  newTabs: "New tabs",
  clear: "Clear",
  selectResults: "Select results",
  clearSelection: "Clear selection",
  closeResults: "Close results",
  noMatchingTabs: "No matching tabs.",
  summary: "$1 tabs, $2 duplicate URL groups",
  visibleResults: "$1 visible results",
  visibleResultsSelected: "$1 visible results, $2 selected",
  selectCount: "Select $1",
  closeSelectedCount: "Close $1 selected",
  closeMatchingCount: "Close $1 matching",
  closeCount: "Close $1",
  closeAll: "Close all",
  closeTab: "Close tab",
  keepOne: "Keep 1",
  keepOneTitle: "Close all but one tab in this group",
  tabsDuplicateUrl: "$1 tabs - duplicate URL",
  oneTab: "1 tab",
  selectTab: "Select $1",
  goToTab: "Go to this tab",
  untitled: "(Untitled)",
  viewedAge: "Viewed $1",
  couldNotCloseTabs: "Could not close all selected tabs. $1",
  chromeRejectedRequest: "Chrome rejected the request.",
  couldNotActivateTab: "Could not activate that tab. $1",
  pageTextSearchNeedsAccess: "Page-text search needs site access. Use Chrome's extension site access menu and allow CleanTabs on all sites.",
  searchingPageText: "Searching page text for \"$1\"...",
  contentSearchStatusMatches: "$1 tabs matched page text.",
  contentSearchStatusSkipped: "$1 browser/internal tabs skipped.",
  contentSearchStatusFailed: "$1 searchable-looking tabs failed. First error: $2",
  noUrl: "(No URL)",
  justNow: "just now",
  minutesAgo: "$1m ago",
  hoursAgo: "$1h ago",
  daysAgo: "$1d ago"
};

const state = {
  tabs: [],
  contentMatches: null,
  contentQuery: "",
  contentSearchRunId: 0,
  statusMessage: "",
  selected: new Set(),
  filters: {
    metadata: "",
    newTabsOnly: false
  }
};

const els = {
  appTitle: document.querySelector("#appTitle"),
  summary: document.querySelector("#summary"),
  refreshButton: document.querySelector("#refreshButton"),
  filters: document.querySelector(".filters"),
  metadataSearchLabel: document.querySelector("#metadataSearchLabel"),
  metadataSearch: document.querySelector("#metadataSearch"),
  contentSearchLabel: document.querySelector("#contentSearchLabel"),
  contentSearch: document.querySelector("#contentSearch"),
  contentSearchButton: document.querySelector("#contentSearchButton"),
  newTabsOnly: document.querySelector("#newTabsOnly"),
  newTabsLabel: document.querySelector("#newTabsLabel"),
  clearFiltersButton: document.querySelector("#clearFiltersButton"),
  contentStatus: document.querySelector("#contentStatus"),
  resultsActions: document.querySelector("#resultsActions"),
  resultsMeta: document.querySelector("#resultsMeta"),
  selectVisibleButton: document.querySelector("#selectVisibleButton"),
  clearSelectionButton: document.querySelector("#clearSelectionButton"),
  closeVisibleButton: document.querySelector("#closeVisibleButton"),
  groups: document.querySelector("#groups"),
  emptyState: document.querySelector("#emptyState")
};

globalThis.cleanTabsPreviewRender = render;
assertRequiredElements();

document.addEventListener("DOMContentLoaded", () => {
  localizeStaticUi();
  globalThis.cleanTabsPreviewLocalize = localizeStaticUi;
  bindEvents();
  refreshTabs();
});

function t(key, substitutions = []) {
  const values = Array.isArray(substitutions) ? substitutions : [substitutions];
  const message = tabApi.i18n?.getMessage?.(key) || DEFAULT_MESSAGES[key] || key;
  return values.reduce((result, value, index) => {
    return result
      .replaceAll(`{${index}}`, String(value))
      .replaceAll(`$${index + 1}`, String(value));
  }, message);
}

function localizeStaticUi() {
  document.documentElement.lang = tabApi.i18n?.getUILanguage?.() || "en";
  document.title = t("appName");
  els.appTitle.textContent = t("appName");
  els.summary.textContent = t("loadingTabs");
  els.refreshButton.textContent = t("refresh");
  els.filters.setAttribute("aria-label", t("tabFiltersLabel"));
  els.metadataSearchLabel.textContent = t("urlOrTitleLabel");
  els.metadataSearch.placeholder = t("searchUrlOrTitlePlaceholder");
  els.contentSearchLabel.textContent = t("pageTextLabel");
  els.contentSearch.placeholder = t("searchLoadedPageTextPlaceholder");
  els.contentSearchButton.textContent = t("search");
  els.newTabsLabel.textContent = t("newTabs");
  els.clearFiltersButton.textContent = t("clear");
  els.selectVisibleButton.textContent = t("selectResults");
  els.clearSelectionButton.textContent = t("clearSelection");
  els.closeVisibleButton.textContent = t("closeResults");
  els.emptyState.textContent = t("noMatchingTabs");
}

function assertRequiredElements() {
  const missing = Object.entries(els)
    .filter(([, element]) => !element)
    .map(([name]) => name);
  if (missing.length) {
    throw new Error(`CleanTabs popup markup is missing required elements: ${missing.join(", ")}`);
  }
}

function bindEvents() {
  els.refreshButton.addEventListener("click", () => refreshTabs({ preserveContentSearch: false }));
  els.metadataSearch.addEventListener("input", () => {
    state.filters.metadata = els.metadataSearch.value.trim().toLowerCase();
    render();
  });
  els.newTabsOnly.addEventListener("change", () => {
    state.filters.newTabsOnly = els.newTabsOnly.checked;
    render();
  });
  els.clearFiltersButton.addEventListener("click", () => {
    state.filters.metadata = "";
    state.filters.newTabsOnly = false;
    state.contentSearchRunId += 1;
    state.contentMatches = null;
    state.contentQuery = "";
    state.statusMessage = "";
    setContentSearchBusy(false);
    state.selected.clear();
    els.metadataSearch.value = "";
    els.contentSearch.value = "";
    els.newTabsOnly.checked = false;
    render();
  });
  els.contentSearchButton.addEventListener("click", runContentSearch);
  els.contentSearch.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      runContentSearch();
    }
  });
  els.selectVisibleButton.addEventListener("click", () => {
    for (const tab of getFilteredTabs()) {
      state.selected.add(tab.id);
    }
    render();
  });
  els.clearSelectionButton.addEventListener("click", () => {
    state.selected.clear();
    render();
  });
  els.closeVisibleButton.addEventListener("click", () => {
    const visibleTabs = getFilteredTabs();
    const selectedVisibleTabs = visibleTabs.filter((tab) => state.selected.has(tab.id));
    closeTabs(selectedVisibleTabs.length ? selectedVisibleTabs : visibleTabs);
  });
}

async function refreshTabs({ preserveContentSearch = true } = {}) {
  const tabs = await tabApi.tabs.query({});

  if (!preserveContentSearch) {
    state.contentSearchRunId += 1;
    state.contentMatches = null;
    state.contentQuery = "";
    state.statusMessage = "";
    els.contentSearch.value = "";
  }

  state.tabs = tabs.sort((a, b) => a.windowId - b.windowId || a.index - b.index);
  removeMissingSelections();
  render();
}

function render() {
  const filtered = getFilteredTabs();
  const groups = groupByUrl(filtered);
  const duplicateCount = groups.filter((group) => group.tabs.length > 1).length;

  els.summary.textContent = t("summary", [state.tabs.length, duplicateCount]);
  renderContentStatus();
  renderResultsActions(filtered);
  els.groups.replaceChildren(...groups.map(renderGroup));
  els.emptyState.hidden = groups.length > 0;
}

function getFilteredTabs() {
  return state.tabs.filter((tab) => {
    if (state.filters.newTabsOnly && !isNewTab(tab)) {
      return false;
    }

    if (state.filters.metadata) {
      const haystack = `${getTabUrl(tab)} ${tab.title || ""}`.toLowerCase();
      if (!haystack.includes(state.filters.metadata)) {
        return false;
      }
    }

    if (state.contentMatches) {
      return state.contentMatches.has(tab.id);
    }

    return true;
  });
}

function groupByUrl(tabs) {
  const byUrl = new Map();
  for (const tab of tabs) {
    const key = normalizeUrl(getTabUrl(tab));
    if (!byUrl.has(key)) {
      byUrl.set(key, []);
    }
    byUrl.get(key).push(tab);
  }

  return [...byUrl.entries()]
    .map(([url, groupTabs]) => ({
      url,
      title: getGroupTitle(groupTabs),
      tabs: groupTabs
    }))
    .sort((a, b) => {
      const duplicateDelta = Number(b.tabs.length > 1) - Number(a.tabs.length > 1);
      return duplicateDelta || b.tabs.length - a.tabs.length || a.url.localeCompare(b.url);
    });
}

function renderResultsActions(filteredTabs) {
  const selectedVisibleTabs = filteredTabs.filter((tab) => state.selected.has(tab.id));
  const shouldShow = filteredTabs.length > 0 && (hasActiveResultFilter() || selectedVisibleTabs.length > 0);

  els.resultsActions.hidden = !shouldShow;
  if (!shouldShow) {
    return;
  }

  const selectedCount = selectedVisibleTabs.length;
  els.resultsMeta.textContent = selectedCount
    ? t("visibleResultsSelected", [filteredTabs.length, selectedCount])
    : t("visibleResults", filteredTabs.length);
  els.selectVisibleButton.textContent = t("selectCount", filteredTabs.length);
  els.clearSelectionButton.disabled = state.selected.size === 0;
  els.closeVisibleButton.disabled = !selectedCount && !hasActiveResultFilter();
  els.closeVisibleButton.textContent = selectedCount
    ? t("closeSelectedCount", selectedCount)
    : t("closeMatchingCount", filteredTabs.length);
}

function hasActiveResultFilter() {
  return Boolean(state.filters.metadata || state.filters.newTabsOnly || state.contentMatches);
}

function renderGroup(group) {
  const selectedInGroup = group.tabs.filter((tab) => state.selected.has(tab.id));
  const isDuplicateGroup = group.tabs.length > 1;
  const groupEl = document.createElement("article");
  groupEl.className = isDuplicateGroup ? "group duplicate-group" : "group single-group";

  const header = document.createElement("header");
  header.className = "group-header";

  const title = document.createElement("div");
  title.className = "group-title";
  const groupLabel = document.createElement("span");
  groupLabel.className = "group-label";
  groupLabel.textContent = group.title || group.url;
  const groupMeta = document.createElement("span");
  groupMeta.className = "group-meta";
  groupMeta.textContent = getGroupMeta(group, isDuplicateGroup);
  title.append(groupLabel, groupMeta);

  const actions = document.createElement("div");
  actions.className = "group-actions";

  const closeSelected = document.createElement("button");
  closeSelected.type = "button";
  closeSelected.className = selectedInGroup.length ? "danger" : "";
  closeSelected.textContent = getPrimaryCloseLabel(group.tabs.length, selectedInGroup.length);
  closeSelected.addEventListener("click", () => {
    closeTabs(selectedInGroup.length ? selectedInGroup : group.tabs);
  });

  actions.append(closeSelected);
  if (isDuplicateGroup) {
    const closeButOne = document.createElement("button");
    closeButOne.type = "button";
    closeButOne.textContent = t("keepOne");
    closeButOne.title = t("keepOneTitle");
    closeButOne.addEventListener("click", () => {
      closeTabs(getTabsExceptKeeper(group.tabs));
    });
    actions.append(closeButOne);
  }
  header.append(title, actions);

  const list = document.createElement("div");
  list.className = "tabs";
  list.append(...group.tabs.map(renderTabRow));

  groupEl.append(header, list);
  return groupEl;
}

function renderTabRow(tab) {
  const row = document.createElement("div");
  row.className = state.selected.has(tab.id) ? "tab-row selected-tab" : "tab-row";

  const checkbox = document.createElement("input");
  checkbox.type = "checkbox";
  checkbox.checked = state.selected.has(tab.id);
  checkbox.setAttribute("aria-label", t("selectTab", tab.title || getTabUrl(tab) || t("untitled")));
  checkbox.addEventListener("change", () => {
    if (checkbox.checked) {
      state.selected.add(tab.id);
    } else {
      state.selected.delete(tab.id);
    }
    render();
  });

  const icon = renderTabIcon(tab);

  const jump = document.createElement("button");
  jump.type = "button";
  jump.className = "tab-jump";
  jump.title = t("goToTab");
  jump.addEventListener("click", () => activateTab(tab));

  const tabTitle = document.createElement("span");
  tabTitle.className = "tab-title";
  tabTitle.textContent = tab.title || t("untitled");

  const tabUrl = document.createElement("span");
  tabUrl.className = "tab-url";
  tabUrl.textContent = getTabUrl(tab);

  jump.append(tabTitle, tabUrl);

  const ages = document.createElement("div");
  ages.className = "tab-ages";
  const viewed = document.createElement("span");
  viewed.textContent = t("viewedAge", formatAge(getLastViewedAt(tab)));
  ages.append(viewed);

  row.append(checkbox, icon, jump, ages);
  return row;
}

function renderTabIcon(tab) {
  const icon = document.createElement("span");
  icon.className = "tab-icon";
  icon.textContent = getTabInitial(tab);

  if (tab.favIconUrl && isScriptableIconUrl(tab.favIconUrl)) {
    const image = document.createElement("img");
    image.src = tab.favIconUrl;
    image.alt = "";
    image.addEventListener("load", () => {
      icon.replaceChildren(image);
      icon.classList.add("has-image");
    });
    image.addEventListener("error", () => {
      icon.classList.remove("has-image");
    });
  }

  return icon;
}

async function closeTabs(tabs) {
  const tabIds = tabs.map((tab) => tab.id).filter(Boolean);
  if (!tabIds.length) {
    return;
  }

  try {
    await tabApi.tabs.remove(tabIds);
  } catch (error) {
    setContentStatus(t("couldNotCloseTabs", error?.message || t("chromeRejectedRequest")));
  }

  for (const id of tabIds) {
    state.selected.delete(id);
  }
  await refreshTabs({ preserveContentSearch: true });
}

async function activateTab(tab) {
  try {
    await tabApi.windows.update(tab.windowId, { focused: true });
    await tabApi.tabs.update(tab.id, { active: true });
    window.close();
  } catch (error) {
    setContentStatus(t("couldNotActivateTab", error?.message || t("chromeRejectedRequest")));
  }
}

async function runContentSearch() {
  const runId = state.contentSearchRunId + 1;
  state.contentSearchRunId = runId;
  const query = els.contentSearch.value.trim();
  state.contentQuery = query;
  state.contentMatches = null;

  if (!query) {
    state.statusMessage = "";
    setContentSearchBusy(false);
    render();
    return;
  }

  setContentSearchBusy(true);
  const hasAccess = await ensurePageContentAccess();
  if (runId !== state.contentSearchRunId) {
    return;
  }
  if (!hasAccess) {
    setContentSearchBusy(false);
    setContentStatus(t("pageTextSearchNeedsAccess"));
    render();
    return;
  }

  setContentStatus(t("searchingPageText", query));
  const queryLower = query.toLowerCase();
  const searchableTabs = state.tabs.slice();
  const results = await mapWithConcurrency(searchableTabs, CONTENT_SEARCH_CONCURRENCY, (tab) => searchTabContent(tab, queryLower));
  if (runId !== state.contentSearchRunId) {
    return;
  }

  const matchedIds = results.filter((result) => result.matched).map((result) => result.tabId);
  const skippedCount = results.filter((result) => result.reason === "not-scriptable").length;
  const failedResults = results.filter((result) => result.failed && result.reason !== "not-scriptable");

  state.contentMatches = new Set(matchedIds);
  setContentSearchBusy(false);
  setContentStatus(formatContentSearchStatus(matchedIds.length, skippedCount, failedResults));
  render();
}

async function ensurePageContentAccess() {
  const permissions = { origins: ["<all_urls>"] };
  try {
    const alreadyGranted = await tabApi.permissions.contains(permissions);
    if (alreadyGranted) {
      return true;
    }
    return await tabApi.permissions.request(permissions);
  } catch (_error) {
    return false;
  }
}

async function searchTabContent(tab, queryLower) {
  if (!tab.id || !isScriptableUrl(getTabUrl(tab))) {
    return { tabId: tab.id, matched: false, failed: true, reason: "not-scriptable" };
  }

  try {
    const [result] = await tabApi.scripting.executeScript({
      target: { tabId: tab.id },
      func: (needle) => {
        const root = document.body || document.documentElement;
        if (!root) {
          return false;
        }

        const ignoredTags = new Set(["SCRIPT", "STYLE", "NOSCRIPT", "TEMPLATE"]);
        const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
          acceptNode(node) {
            const parent = node.parentElement;
            if (!parent || ignoredTags.has(parent.tagName)) {
              return NodeFilter.FILTER_REJECT;
            }
            return node.nodeValue.trim()
              ? NodeFilter.FILTER_ACCEPT
              : NodeFilter.FILTER_REJECT;
          }
        });

        for (let node = walker.nextNode(); node; node = walker.nextNode()) {
          if (node.nodeValue.toLowerCase().includes(needle)) {
            return true;
          }
        }
        return false;
      },
      args: [queryLower]
    });
    return { tabId: tab.id, matched: Boolean(result?.result), failed: false };
  } catch (error) {
    return {
      tabId: tab.id,
      matched: false,
      failed: true,
      reason: error?.message || "blocked"
    };
  }
}

function formatContentSearchStatus(matchedCount, skippedCount, failedResults) {
  const parts = [t("contentSearchStatusMatches", matchedCount)];
  if (skippedCount) {
    parts.push(t("contentSearchStatusSkipped", skippedCount));
  }
  if (failedResults.length) {
    const sample = failedResults[0].reason;
    parts.push(t("contentSearchStatusFailed", [failedResults.length, sample]));
  }
  return parts.join(" ");
}

function renderContentStatus() {
  if (!state.statusMessage) {
    els.contentStatus.hidden = true;
    els.contentStatus.textContent = "";
    return;
  }
  els.contentStatus.hidden = false;
  els.contentStatus.textContent = state.statusMessage;
}

function setContentStatus(text) {
  state.statusMessage = text;
  els.contentStatus.hidden = false;
  els.contentStatus.textContent = text;
}

function setContentSearchBusy(isBusy) {
  els.contentSearchButton.disabled = isBusy;
  els.contentSearchButton.textContent = isBusy ? t("searching") : t("search");
}

async function mapWithConcurrency(items, concurrency, mapper) {
  const results = new Array(items.length);
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < items.length) {
      const index = nextIndex;
      nextIndex += 1;
      results[index] = await mapper(items[index]);
    }
  }

  const workerCount = Math.min(concurrency, items.length);
  await Promise.all(Array.from({ length: workerCount }, worker));
  return results;
}

function removeMissingSelections() {
  const currentTabIds = new Set(state.tabs.map((tab) => tab.id));
  state.selected = new Set([...state.selected].filter((id) => currentTabIds.has(id)));
}

function normalizeUrl(url) {
  if (!url) {
    return t("noUrl");
  }
  try {
    const parsed = new URL(url);
    parsed.hash = "";
    return parsed.toString();
  } catch (_error) {
    return url;
  }
}

function isNewTab(tab) {
  const url = getTabUrl(tab);
  return NEW_TAB_URLS.has(url) || url.startsWith("chrome://newtab") || url.startsWith("edge://newtab");
}

function isScriptableUrl(url = "") {
  return /^https?:\/\//i.test(url) || /^file:\/\//i.test(url);
}

function getTabUrl(tab) {
  return tab.url || tab.pendingUrl || "";
}

function isScriptableIconUrl(url = "") {
  return /^https?:\/\//i.test(url) || /^data:image\//i.test(url);
}

function getTabInitial(tab) {
  const host = getTabHost(tab);
  const source = host || tab.title || "?";
  return source.trim().charAt(0).toUpperCase() || "?";
}

function getTabHost(tab) {
  try {
    return new URL(getTabUrl(tab)).hostname.replace(/^www\./, "");
  } catch (_error) {
    return "";
  }
}

function getGroupTitle(tabs) {
  const titles = [...new Set(tabs.map((tab) => (tab.title || "").trim()).filter(Boolean))];
  return titles.length === 1 ? titles[0] : "";
}

function getGroupMeta(group, isDuplicateGroup) {
  const prefix = isDuplicateGroup ? t("tabsDuplicateUrl", group.tabs.length) : t("oneTab");
  return group.title ? `${prefix} - ${group.url}` : prefix;
}

function getPrimaryCloseLabel(groupSize, selectedCount) {
  if (selectedCount) {
    return t("closeCount", selectedCount);
  }
  return groupSize === 1 ? t("closeTab") : t("closeAll");
}

function getTabsExceptKeeper(tabs) {
  const keeper = tabs.find((tab) => tab.active) || tabs[0];
  return tabs.filter((tab) => tab.id !== keeper.id);
}

function getLastViewedAt(tab) {
  return tab.lastAccessed || Date.now();
}

function formatAge(timestamp) {
  if (!timestamp) {
    return "unknown";
  }

  const elapsed = Math.max(0, Date.now() - timestamp);
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (elapsed < minute) {
    return t("justNow");
  }
  if (elapsed < hour) {
    return t("minutesAgo", Math.floor(elapsed / minute));
  }
  if (elapsed < day) {
    return t("hoursAgo", Math.floor(elapsed / hour));
  }
  return t("daysAgo", Math.floor(elapsed / day));
}
