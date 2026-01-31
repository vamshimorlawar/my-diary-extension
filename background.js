const FREE_MAX_ENTRIES = 50;
const PREMIUM_MAX_TRASH = 50;
const DEFAULT_TAGS = ["text", "link", "quote", "code", "idea", "todo"];

async function isPremium() {
  const result = await chrome.storage.sync.get(["premiumLicense"]);
  return !!result.premiumLicense?.valid;
}

// Create context menu item when extension is installed
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "addToMyDiary",
    title: "Add to My Diary",
    contexts: ["selection"]
  });
});

// Handle context menu click
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === "addToMyDiary") {
    // Inject CSS first
    await chrome.scripting.insertCSS({
      target: { tabId: tab.id },
      files: ["content.css"]
    });

    // Inject content script to show modal
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ["content.js"]
    });

    // Send data to content script
    chrome.tabs.sendMessage(tab.id, {
      action: "showDiaryModal",
      data: {
        text: info.selectionText,
        url: tab.url,
        pageTitle: tab.title
      }
    });
  }
});

// Listen for save from content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "saveDiaryEntry") {
    (async () => {
      const premium = await isPremium();
      const result = await chrome.storage.local.get(["diaryEntries", "customTags"]);
      const entries = result.diaryEntries || [];
      const customTags = result.customTags || [];

      // Free tier: soft limit - allow if existing user has > 50, block only new saves when at/over limit
      if (!premium && entries.length >= FREE_MAX_ENTRIES) {
        sendResponse({ success: false, reason: "entry_limit", limit: FREE_MAX_ENTRIES });
        return;
      }

      // Free tier: custom tag limit - count only custom tags (exclude defaults)
      const customOnly = customTags.filter(t => !DEFAULT_TAGS.includes(t));
      const newTagsFromData = (message.data.tags || []).filter(t => !DEFAULT_TAGS.includes(t));
      const wouldExceedCustomTags = !premium && customOnly.length >= 3;
      const addingNewCustom = newTagsFromData.some(t => !customTags.includes(t));
      if (wouldExceedCustomTags && addingNewCustom) {
        sendResponse({ success: false, reason: "custom_tag_limit", limit: 3 });
        return;
      }

      const folder = (message.data.folder || "").trim();
      const entry = {
        id: Date.now().toString(),
        text: message.data.text,
        url: message.data.url,
        pageTitle: message.data.pageTitle,
        date: new Date().toISOString(),
        tags: message.data.tags || [],
        comment: message.data.comment || "",
        folder: folder,
        isFavourite: false
      };

      entries.unshift(entry);

      const existingTags = customTags;
      const newTags = (message.data.tags || []).filter(t => !existingTags.includes(t) && !DEFAULT_TAGS.includes(t));
      const allTags = [...existingTags, ...newTags];
      const customFolders = (await chrome.storage.local.get(["customFolders"])).customFolders || [];
      if (folder && !customFolders.includes(folder) && !["General", "Research", "Personal", "Work"].includes(folder)) {
        customFolders.push(folder);
      }
      await chrome.storage.local.set({ diaryEntries: entries, customTags: allTags, customFolders });

      chrome.action.setBadgeText({ text: "✓" });
      chrome.action.setBadgeBackgroundColor({ color: "#4CAF50" });
      setTimeout(() => {
        chrome.action.setBadgeText({ text: "" });
      }, 2000);
      sendResponse({ success: true });
    })();
    return true;
  }

  if (message.action === "checkPremium") {
    (async () => {
      const premium = await isPremium();
      sendResponse({ premium });
    })();
    return true;
  }

  if (message.action === "activateLicense") {
    (async () => {
      const key = (message.key || "").trim();
      const valid = key.length >= 10 && key.includes("-");
      if (valid) {
        await chrome.storage.sync.set({ premiumLicense: { valid: true, key: key.substring(0, 8) + "..." } });
        sendResponse({ success: true });
      } else {
        sendResponse({ success: false, reason: "invalid_format" });
      }
    })();
    return true;
  }

  if (message.action === "getCustomTags") {
    (async () => {
      const premium = await isPremium();
      const result = await chrome.storage.local.get(["customTags"]);
      const tags = result.customTags || [];
      const customOnly = tags.filter(t => !DEFAULT_TAGS.includes(t));
      const canAddCustomTag = premium || customOnly.length < 3;
      sendResponse({ tags, canAddCustomTag, isPremium: premium });
    })();
    return true;
  }

  if (message.action === "getFoldersForModal") {
    (async () => {
      const premium = await isPremium();
      if (!premium) {
        sendResponse({ folders: [], isPremium: false });
        return;
      }
      const result = await chrome.storage.local.get(["diaryEntries", "customFolders"]);
      const entries = result.diaryEntries || [];
      const customFolders = result.customFolders || [];
      const fromEntries = [...new Set(entries.map(e => e.folder).filter(Boolean))];
      const all = [...new Set([...["General", "Research", "Personal", "Work"], ...fromEntries, ...customFolders])].filter(Boolean).sort();
      sendResponse({ folders: all, isPremium: true });
    })();
    return true;
  }
});
