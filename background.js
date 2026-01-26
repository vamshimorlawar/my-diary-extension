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
    const entry = {
      id: Date.now().toString(),
      text: message.data.text,
      url: message.data.url,
      pageTitle: message.data.pageTitle,
      date: new Date().toISOString(),
      tags: message.data.tags || [],
      comment: message.data.comment || "",
      isFavourite: false
    };

    chrome.storage.local.get(["diaryEntries", "customTags"], (result) => {
      const entries = result.diaryEntries || [];
      entries.unshift(entry);
      
      // Save any new custom tags
      const existingTags = result.customTags || [];
      const newTags = message.data.tags.filter(t => !existingTags.includes(t) && !["text", "link", "quote", "code", "idea", "todo"].includes(t));
      const allTags = [...existingTags, ...newTags];

      chrome.storage.local.set({ diaryEntries: entries, customTags: allTags }, () => {
        // Show notification badge
        chrome.action.setBadgeText({ text: "✓" });
        chrome.action.setBadgeBackgroundColor({ color: "#4CAF50" });
        setTimeout(() => {
          chrome.action.setBadgeText({ text: "" });
        }, 2000);
        sendResponse({ success: true });
      });
    });
    return true; // Keep channel open for async response
  }

  if (message.action === "getCustomTags") {
    chrome.storage.local.get(["customTags"], (result) => {
      sendResponse({ tags: result.customTags || [] });
    });
    return true;
  }
});
