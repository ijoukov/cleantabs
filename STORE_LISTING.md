# Chrome Web Store Listing Draft

## Name

CleanTabs

## Summary

Find duplicate, stale, new, and matching Chrome tabs, then close or jump to them quickly.

## Description

CleanTabs helps you clean up a crowded browser without losing context.

Open the extension popup to see your current tabs grouped by URL, making accidental duplicates easy to spot. Each group can be closed entirely, reduced to one tab, or cleaned up with per-tab checkboxes. Search by URL, page title, or loaded page text, then close all matching results across groups or select only the tabs you want to remove.

Features:

- Group open tabs by normalized URL.
- Surface duplicate groups first.
- Search tab URLs and titles.
- Search visible page text on supported pages when site access is granted.
- Filter browser new-tab pages.
- Close all tabs in a group, close all but one, or close selected tabs.
- Select and close matching results across multiple groups.
- Jump directly to any listed tab.
- Show approximate last viewed age.

CleanTabs runs locally in your browser and does not send tab data or page content to a server.

## Category

Productivity

## Single Purpose

CleanTabs helps users find, review, close, and switch between open browser tabs.

## Permission Justifications

### tabs

Required to list open tabs, show URLs and titles, activate a selected tab, and close tabs selected by the user.

### scripting

Required only for page-text search, where CleanTabs injects a short script into open pages to check visible text for the user's search query.

### Optional host permissions

Required only when the user chooses page-text search. Chrome blocks page inspection unless the user grants site access.
