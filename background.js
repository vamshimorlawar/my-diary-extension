const FREE_MAX_ENTRIES = 50;
const PREMIUM_MAX_TRASH = 50;
const DEFAULT_TAGS = ["text", "link", "quote", "code", "idea", "todo"];

// Gumroad config - Product ID from Gumroad dashboard
const GUMROAD_PRODUCT_ID = "cxGbdmSnLsvOeIvGQZAWsQ==";
// Set to true to accept Gumroad test keys (for testing - do a test purchase while logged in)
const ALLOW_TEST_KEYS = false;

async function verifyGumroadLicense(licenseKey) {
  const key = licenseKey.trim();
  if (!key || key.length < 10) return { valid: false, reason: "invalid_format" };
  try {
    const res = await fetch("https://api.gumroad.com/v2/licenses/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        product_id: GUMROAD_PRODUCT_ID,
        license_key: key,
        increment_uses_count: false
      })
    });
    const data = await res.json();
    if (!data.success) return { valid: false, reason: "invalid", message: data.message || "" };
    const p = data.purchase || {};
    if (p.test && !ALLOW_TEST_KEYS) return { valid: false, reason: "test_key" };
    if (p.refunded || p.chargebacked) return { valid: false, reason: "refunded" };
    const endedAt = p.subscription_ended_at || p.subscription_cancelled_at || p.subscription_failed_at;
    if (endedAt && new Date(endedAt) <= new Date()) return { valid: false, reason: "expired", expiresAt: endedAt };
    return {
      valid: true,
      key: p.license_key,
      plan: p.recurrence || "lifetime",
      expiresAt: endedAt || null,
      recurrence: p.recurrence
    };
  } catch (err) {
    return { valid: false, reason: "network_error" };
  }
}

async function isPremium() {
  const result = await chrome.storage.sync.get(["premiumLicense"]);
  const lic = result.premiumLicense;
  if (!lic?.valid) return false;
  if (lic.expiresAt && new Date(lic.expiresAt) <= new Date()) return false;
  return true;
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
      const result = await verifyGumroadLicense(message.key || "");
      if (result.valid) {
        await chrome.storage.sync.set({
          premiumLicense: {
            valid: true,
            key: result.key ? result.key.substring(0, 8) + "..." : "",
            plan: result.plan,
            expiresAt: result.expiresAt || null,
            recurrence: result.recurrence
          }
        });
        sendResponse({ success: true, plan: result.plan, expiresAt: result.expiresAt });
      } else {
        sendResponse({ success: false, reason: result.reason, message: result.message, expiresAt: result.expiresAt });
      }
    })();
    return true;
  }

  if (message.action === "getLicenseInfo") {
    (async () => {
      const result = await chrome.storage.sync.get(["premiumLicense"]);
      const lic = result.premiumLicense;
      if (!lic) {
        sendResponse({ premium: false, license: null });
        return;
      }
      const premium = await isPremium();
      sendResponse({ premium, license: lic });
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
