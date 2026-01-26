# My Diary - Chrome Extension

A simple Chrome extension to save text snippets from any webpage to your personal diary.

[![Chrome Web Store](https://img.shields.io/badge/Chrome%20Web%20Store-Install-blue?logo=googlechrome)](https://chromewebstore.google.com/detail/my-diary/nfdcipolchlmlipikekpbbmpdpienajm)

## Features

- **Right-click to save**: Select any text on a webpage, right-click, and choose "Add to My Diary"
- **Automatic metadata**: Each entry saves the selected text, source URL, page title, and timestamp
- **Add comments**: Add personal notes or thoughts to any saved entry
- **Search entries**: Quickly find entries by searching text, titles, or comments
- **Clean UI**: Modern, simple interface for managing your diary entries

## Installation

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable **Developer mode** (toggle in the top-right corner)
3. Click **Load unpacked**
4. Select the `my-diary-extension` folder
5. The extension icon will appear in your Chrome toolbar

## Usage

### Saving Content
1. Select any text on a webpage
2. Right-click to open the context menu
3. Click **"Add to My Diary"**
4. A checkmark badge will briefly appear confirming the save

### Viewing Entries
1. Click the My Diary icon in your Chrome toolbar
2. Browse through your saved entries
3. Click on source links to revisit the original pages

### Adding Comments
1. Click **"Add Comment"** on any entry
2. Type your notes in the text area
3. Click **"Save Comment"**

### Searching
- Use the search bar at the top to filter entries
- Searches through text content, page titles, and comments

### Deleting Entries
- Click the **×** button on any entry to delete it
- Use **"Clear All"** to remove all entries (with confirmation)

## Files Structure

```
my-diary-extension/
├── manifest.json      # Extension configuration
├── background.js      # Service worker (context menu handling)
├── popup.html         # Extension popup UI
├── popup.css          # Popup styling
├── popup.js           # Popup logic
├── icons/
│   ├── icon16.png     # 16x16 icon
│   ├── icon48.png     # 48x48 icon
│   └── icon128.png    # 128x128 icon
└── README.md          # This file
```

## Data Storage

All diary entries are stored locally in Chrome's storage (`chrome.storage.local`). Data persists across browser sessions and is private to your browser.

## License

MIT License - Feel free to modify and distribute.
