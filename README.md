# CleanTabs

CleanTabs is a local Chrome extension for tab cleanup.

## Local install

1. Open `chrome://extensions`.
2. Enable **Developer mode**.
3. Click **Load unpacked**.
4. Select this folder: `/home/ijoukov/code/cleantabs`.

## Features

- Popup view listing all open tabs, grouped by normalized URL.
- Duplicate groups float to the top.
- Search by partial URL or page title.
- Optional filter for browser new-tab pages.
- Group actions to close all tabs, close all but one, or close selected tabs.
- Per-tab checkboxes; once selected, the group close button changes to `Close X`.
- Click any tab result to focus its window and activate that tab.
- Shows approximate opened age and last viewed age.
- Page-text search across scriptable tabs.

## Development

```bash
npm run icons
npm run validate
npm run package
```

`npm run package` writes a Chrome Web Store upload zip to `dist/cleantabs-0.1.0.zip`.

## Publishing checklist

1. Run `npm run validate`.
2. Run `npm run package`.
3. Create a Chrome Web Store developer account.
4. Create a new item and upload `dist/cleantabs-0.1.0.zip`.
5. Use the copy in `STORE_LISTING.md` as the first draft of the store listing.
6. Use `PRIVACY.md` for the privacy policy content.

## Notes

Chrome does not expose the true original open time for tabs that already existed before the extension was installed or the browser session started. CleanTabs starts tracking open time after installation/startup, so those existing tabs are approximate.

Page-text search requires `scripting` and `<all_urls>` permissions. Chrome blocks scripted access to some pages, including internal browser pages and Chrome Web Store pages, so those tabs are counted as unsearchable.
