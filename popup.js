document.addEventListener('DOMContentLoaded', () => {
  const entriesContainer = document.getElementById('entriesContainer');
  const trashContainer = document.getElementById('trashContainer');
  const searchInput = document.getElementById('searchInput');
  const clearAllBtn = document.getElementById('clearAllBtn');
  const emptyTrashBtn = document.getElementById('emptyTrashBtn');
  const entriesControls = document.getElementById('entriesControls');
  const trashControls = document.getElementById('trashControls');
  const trashCountBadge = document.getElementById('trashCount');
  const entriesCountBadge = document.getElementById('entriesCount');
  const filterBar = document.getElementById('filterBar');
  const folderFilter = document.getElementById('folderFilter');
  const tagFilter = document.getElementById('tagFilter');
  const favFilterBtn = document.getElementById('favFilterBtn');
  const tabs = document.querySelectorAll('.tab');

  // SVG Icons
  const icons = {
    star: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`,
    trash: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>`,
    link: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/></svg>`,
    comment: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>`,
    edit: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>`,
    restore: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 12a9 9 0 109-9 9.75 9.75 0 00-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>`,
    x: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>`,
    copy: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>`,
    check: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>`
  };

  let allEntries = [];
  let trashEntries = [];
  let customTags = [];
  let currentTab = 'entries';
  let filterByFavourites = false;
  let isPremiumUser = false;

  const FREE_MAX_ENTRIES = 10;
  const FREE_MAX_TRASH = 2;
  const FREE_MAX_CUSTOM_TAGS = 3;
  const PREMIUM_MAX_TRASH = 50;
  const DEFAULT_TAGS = ["text", "link", "quote", "code", "idea", "todo"];

  // Load data on popup open
  loadData();

  // Tab switching
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const tabName = tab.dataset.tab;
      switchTab(tabName);
    });
  });

  function switchTab(tabName) {
    currentTab = tabName;
    tabs.forEach(t => t.classList.toggle('active', t.dataset.tab === tabName));
    
    entriesContainer.classList.toggle('hidden', tabName !== 'entries');
    trashContainer.classList.toggle('hidden', tabName !== 'trash');
    document.getElementById('settingsContainer').classList.toggle('hidden', tabName !== 'settings');
    entriesControls.classList.toggle('hidden', tabName !== 'entries');
    filterBar.classList.toggle('hidden', tabName !== 'entries');
    trashControls.classList.toggle('hidden', tabName !== 'trash');
    
    if (tabName === 'entries') applyFilters();
    else if (tabName === 'trash') renderTrash();
    else if (tabName === 'settings') updateLicenseUI();
  }

  // Search functionality
  searchInput.addEventListener('input', () => {
    applyFilters();
  });

  // Tag filter
  tagFilter.addEventListener('change', () => {
    applyFilters();
  });

  // Folder filter
  folderFilter?.addEventListener('change', () => {
    applyFilters();
  });

  // Favourite filter
  favFilterBtn.addEventListener('click', () => {
    filterByFavourites = !filterByFavourites;
    favFilterBtn.classList.toggle('active', filterByFavourites);
    applyFilters();
  });

  function applyFilters() {
    const query = searchInput.value.toLowerCase();
    const selectedTag = tagFilter.value;
    const selectedFolder = folderFilter?.value || "";
    
    let filtered = allEntries;
    
    if (query) {
      filtered = filtered.filter(entry => 
        entry.text.toLowerCase().includes(query) ||
        entry.pageTitle?.toLowerCase().includes(query) ||
        entry.comment?.toLowerCase().includes(query) ||
        entry.tags?.some(t => t.toLowerCase().includes(query))
      );
    }
    
    if (selectedTag) {
      filtered = filtered.filter(entry => 
        entry.tags && entry.tags.includes(selectedTag)
      );
    }

    if (selectedFolder) {
      filtered = filtered.filter(entry => (entry.folder || "") === selectedFolder);
    }
    
    if (filterByFavourites) {
      filtered = filtered.filter(entry => entry.isFavourite);
    }
    
    renderEntries(filtered);
  }

  // Clear all entries
  clearAllBtn.addEventListener('click', () => {
    if (confirm('Delete all entries? They will be moved to trash.')) {
      const entriesToTrash = allEntries.map(entry => ({
        ...entry,
        deletedAt: new Date().toISOString()
      }));
      trashEntries = [...entriesToTrash, ...trashEntries].slice(0, getMaxTrashSize());
      allEntries = [];
      
      saveData(() => {
        renderEntries([]);
        updateTrashBadge();
        updateEntriesBadge();
      });
    }
  });

  // Export
  document.getElementById('exportBtn')?.addEventListener('click', () => {
    if (!isPremiumUser) {
      switchTab('settings');
      return;
    }
    showExportMenu();
  });

  function showExportMenu() {
    const btn = document.getElementById('exportBtn');
    let menu = document.getElementById('exportMenu');
    if (menu) {
      menu.remove();
      return;
    }
    menu = document.createElement('div');
    menu.id = 'exportMenu';
    menu.className = 'export-menu';
    menu.innerHTML = `
      <button data-format="json">Export as JSON</button>
      <button data-format="markdown">Export as Markdown</button>
    `;
    document.body.appendChild(menu);
    const rect = btn.getBoundingClientRect();
    menu.style.position = 'fixed';
    menu.style.top = `${rect.bottom + 4}px`;
    menu.style.left = `${rect.right - 140}px`;
    menu.querySelectorAll('button').forEach(b => {
      b.addEventListener('click', () => {
        exportData(b.dataset.format);
        menu.remove();
      });
    });
    document.addEventListener('click', function closeMenu(e) {
      if (!menu.contains(e.target) && e.target !== btn) {
        menu.remove();
        document.removeEventListener('click', closeMenu);
      }
    });
  }

  function exportData(format) {
    const data = { entries: allEntries, exportedAt: new Date().toISOString() };
    let content, filename, mime;
    if (format === 'markdown') {
      content = allEntries.map(e => {
        const d = new Date(e.date).toLocaleString();
        const tags = (e.tags || []).length ? ` [${e.tags.join(', ')}]` : '';
        const comment = e.comment ? `\n> ${e.comment}` : '';
        return `## ${d}${tags}\n\n${e.text}\n\nSource: ${e.url}${comment}\n\n---`;
      }).join('\n\n');
      filename = `my-diary-${Date.now()}.md`;
      mime = 'text/markdown';
    } else {
      content = JSON.stringify(data, null, 2);
      filename = `my-diary-${Date.now()}.json`;
      mime = 'application/json';
    }
    const blob = new Blob([content], { type: mime });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  // License activation
  document.getElementById('activateLicenseBtn')?.addEventListener('click', () => {
    const keyInput = document.getElementById('licenseKeyInput');
    const msgEl = document.getElementById('licenseMessage');
    const btn = document.getElementById('activateLicenseBtn');
    const key = keyInput?.value?.trim() || '';
    const errMsg = {
      invalid_format: 'Please enter a valid license key (at least 10 characters, e.g. XXXX-XXXX-XXXX).',
      invalid: 'Invalid license key. Please check and try again.',
      test_key: 'This is a test key. Get a real license from the purchase link.',
      refunded: 'This license has been refunded and is no longer valid.',
      expired: 'This subscription has expired. Renew to continue using Pro.',
      network_error: 'Could not verify. Check your internet connection and try again.'
    };
    if (!key) {
      msgEl.textContent = errMsg.invalid_format;
      msgEl.className = 'license-message error';
      msgEl.classList.remove('hidden');
      return;
    }
    btn.disabled = true;
    btn.textContent = 'Verifying...';
    chrome.runtime.sendMessage({ action: 'activateLicense', key }, (response) => {
      btn.disabled = false;
      btn.textContent = 'Activate';
      if (response?.success) {
        isPremiumUser = true;
        msgEl.textContent = 'Pro activated. Enjoy unlimited entries!';
        msgEl.className = 'license-message success';
        msgEl.classList.remove('hidden');
        keyInput.value = '';
        updateLicenseUI();
        updateUpgradeUI();
        populateFolderFilter();
      } else {
        msgEl.textContent = (response?.message && response.message.length > 0) ? response.message : (errMsg[response?.reason] || errMsg.invalid);
        msgEl.className = 'license-message error';
        msgEl.classList.remove('hidden');
      }
    });
  });

  function formatExpiryDate(isoStr) {
    if (!isoStr) return null;
    const d = new Date(isoStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  document.getElementById('deactivateLicenseLink')?.addEventListener('click', (e) => {
    e.preventDefault();
    chrome.storage.sync.remove(['premiumLicense'], () => {
      isPremiumUser = false;
      updateLicenseUI();
      updateUpgradeUI();
      populateFolderFilter();
    });
  });

  function updateLicenseUI() {
    const statusEl = document.getElementById('licenseStatus');
    const expiryEl = document.getElementById('licenseExpiry');
    const subtitleEl = document.getElementById('licenseSubtitle');
    const formEl = document.getElementById('licenseForm');
    const msgEl = document.getElementById('licenseMessage');
    const darkSection = document.getElementById('darkModeSection');
    const deactivateLink = document.getElementById('deactivateLicenseLink');
    if (!statusEl || !formEl) return;
    chrome.runtime.sendMessage({ action: 'getLicenseInfo' }, (response) => {
      isPremiumUser = response?.premium ?? false;
      const lic = response?.license;
      if (isPremiumUser && lic) {
        const planLabel = lic.plan === 'monthly' ? 'Monthly' : lic.plan === 'yearly' ? 'Yearly' : 'Lifetime';
        statusEl.textContent = `Pro (${planLabel})`;
        statusEl.classList.add('success');
        if (expiryEl) {
          const expiresStr = formatExpiryDate(lic.expiresAt);
          if (expiresStr) {
            expiryEl.textContent = `Expires ${expiresStr}`;
            expiryEl.classList.remove('hidden');
          } else if (lic.plan !== 'lifetime' && lic.recurrence) {
            expiryEl.textContent = 'Renews automatically';
            expiryEl.classList.remove('hidden');
          } else {
            expiryEl.classList.add('hidden');
          }
        }
        if (subtitleEl) {
          subtitleEl.textContent = 'You have access to all Pro features.';
          subtitleEl.classList.remove('hidden');
        }
        formEl.classList.add('hidden');
        if (msgEl) msgEl.classList.add('hidden');
        if (deactivateLink) deactivateLink.classList.remove('hidden');
        if (darkSection) darkSection.classList.remove('hidden');
        loadTheme();
      } else {
        statusEl.textContent = 'Free';
        statusEl.classList.remove('success');
        if (expiryEl) expiryEl.classList.add('hidden');
        if (subtitleEl) {
          subtitleEl.textContent = 'Upgrade for unlimited entries, export, dark mode & folders.';
          subtitleEl.classList.remove('hidden');
        }
        formEl.classList.remove('hidden');
        if (deactivateLink) deactivateLink.classList.add('hidden');
        if (darkSection) darkSection.classList.add('hidden');
      }
    });
  }

  function loadTheme() {
    chrome.storage.sync.get(['theme'], (r) => {
      const isDark = r.theme === 'dark';
      document.body.classList.toggle('theme-dark', isDark);
      const toggle = document.getElementById('darkModeToggle');
      if (toggle) toggle.checked = isDark;
    });
  }

  document.getElementById('darkModeToggle')?.addEventListener('change', (e) => {
    if (!isPremiumUser) return;
    const theme = e.target.checked ? 'dark' : 'light';
    chrome.storage.sync.set({ theme }, () => {
      document.body.classList.toggle('theme-dark', theme === 'dark');
    });
  });

  // Empty trash
  emptyTrashBtn.addEventListener('click', () => {
    if (confirm('Permanently delete all items in trash?')) {
      trashEntries = [];
      saveData(() => {
        renderTrash();
        updateTrashBadge();
      });
    }
  });

  function loadData() {
    chrome.runtime.sendMessage({ action: "checkPremium" }, (response) => {
      isPremiumUser = response?.premium ?? false;
      chrome.storage.local.get(['diaryEntries', 'trashEntries', 'customTags'], (result) => {
        allEntries = result.diaryEntries || [];
        trashEntries = result.trashEntries || [];
        customTags = result.customTags || [];
        applyTrashLimit();
        populateTagFilter();
        populateFolderFilter();
        applyFilters();
        updateTrashBadge();
        updateEntriesBadge();
        updateUpgradeUI();
        if (isPremiumUser) loadTheme();
      });
    });
  }

  function applyTrashLimit() {
    const maxTrash = isPremiumUser ? PREMIUM_MAX_TRASH : FREE_MAX_TRASH;
    if (trashEntries.length > maxTrash) {
      trashEntries = trashEntries.slice(0, maxTrash);
      saveData(() => {});
    }
  }

  function getMaxTrashSize() {
    return isPremiumUser ? PREMIUM_MAX_TRASH : FREE_MAX_TRASH;
  }

  function updateUpgradeUI() {
    const upgradeBanner = document.getElementById("upgradeBanner");
    const upgradeLink = document.getElementById("upgradeLink");
    if (isPremiumUser) {
      if (upgradeBanner) upgradeBanner.classList.add("hidden");
      if (upgradeLink) upgradeLink.classList.add("hidden");
      const proBadge = document.getElementById("proBadge");
      if (proBadge) proBadge.classList.remove("hidden");
    } else {
      if (upgradeBanner) {
        const atEntryLimit = allEntries.length >= FREE_MAX_ENTRIES;
        upgradeBanner.classList.toggle("hidden", !atEntryLimit);
      }
      if (upgradeLink) upgradeLink.classList.remove("hidden");
      const proBadge = document.getElementById("proBadge");
      if (proBadge) proBadge.classList.add("hidden");
    }
  }

  function saveData(callback) {
    chrome.storage.local.set({ 
      diaryEntries: allEntries, 
      trashEntries: trashEntries,
      customTags: customTags
    }, callback);
  }

  function populateTagFilter() {
    tagFilter.innerHTML = '<option value="">All Tags</option>';
    
    const allTags = new Set();
    allEntries.forEach(entry => {
      if (entry.tags) {
        entry.tags.forEach(tag => allTags.add(tag));
      }
    });
    
    [...DEFAULT_TAGS, ...customTags].forEach(tag => allTags.add(tag));
    
    Array.from(allTags).sort().forEach(tag => {
      const option = document.createElement('option');
      option.value = tag;
      option.textContent = toTitleCase(tag);
      tagFilter.appendChild(option);
    });
  }

  function populateFolderFilter() {
    if (!folderFilter) return;
    const folders = [...new Set(allEntries.map(e => e.folder).filter(Boolean))].sort();
    folderFilter.innerHTML = '<option value="">All Folders</option>';
    folders.forEach(f => {
      const option = document.createElement('option');
      option.value = f;
      option.textContent = f;
      folderFilter.appendChild(option);
    });
    folderFilter.classList.toggle('hidden', !isPremiumUser);
  }

  function updateTrashBadge() {
    const trashInfo = document.getElementById('trashInfo');
    if (trashInfo) trashInfo.textContent = `Last ${getMaxTrashSize()} deleted`;
    if (trashEntries.length > 0) {
      trashCountBadge.textContent = trashEntries.length;
      trashCountBadge.classList.remove('hidden');
    } else {
      trashCountBadge.classList.add('hidden');
    }
  }

  function updateEntriesBadge() {
    if (!entriesCountBadge) return;
    if (allEntries.length > 0) {
      entriesCountBadge.textContent = allEntries.length;
      entriesCountBadge.classList.remove('hidden');
    } else {
      entriesCountBadge.classList.add('hidden');
    }
  }

  function renderEntries(entries) {
    entriesContainer.innerHTML = '';
    
    if (entries.length === 0) {
      entriesContainer.appendChild(createEmptyState('entries'));
      return;
    }

    entries.forEach(entry => {
      entriesContainer.appendChild(createEntryElement(entry));
    });
  }

  function renderTrash() {
    trashContainer.innerHTML = '';
    
    if (trashEntries.length === 0) {
      trashContainer.appendChild(createEmptyState('trash'));
      return;
    }

    trashEntries.forEach(entry => {
      trashContainer.appendChild(createTrashElement(entry));
    });
  }

  function createEmptyState(type) {
    const div = document.createElement('div');
    div.className = 'empty-state';
    
    if (type === 'entries') {
      div.innerHTML = `
        <p>No entries yet</p>
        <p class="hint">Select text on any page, right-click, and choose "Add to My Diary"</p>
      `;
    } else {
      div.innerHTML = `
        <p>Trash is empty</p>
        <p class="hint">Deleted entries appear here</p>
      `;
    }
    return div;
  }

  function createEntryElement(entry) {
    const div = document.createElement('div');
    div.className = 'entry';
    div.dataset.id = entry.id;

    const formattedDate = formatRelativeDate(entry.date);
    const hasComment = entry.comment && entry.comment.trim() !== '';
    const hasTags = entry.tags && entry.tags.length > 0;
    const hasFolder = isPremiumUser && entry.folder;
    const isFav = entry.isFavourite;

    div.innerHTML = `
      <div class="entry-header">
        <div class="entry-header-left">
          <span class="entry-date">${formattedDate}</span>
          ${hasFolder ? `<span class="entry-folder">${escapeHtml(entry.folder)}</span>` : ''}
        </div>
        <div class="entry-header-right">
          <button class="icon-btn copy-btn" title="Copy">${icons.copy}</button>
          <button class="icon-btn fav-btn ${isFav ? 'active' : ''}" title="Favourite">${icons.star}</button>
          <button class="icon-btn delete-btn" title="Delete">${icons.x}</button>
        </div>
      </div>
      <div class="entry-text">${escapeHtml(entry.text)}</div>
      ${hasTags ? `
        <div class="entry-tags">
          ${entry.tags.map(tag => `<span class="entry-tag">${escapeHtml(toTitleCase(tag))}</span>`).join('')}
        </div>
      ` : ''}
      <div class="entry-source">
        ${icons.link}
        <a href="${escapeHtml(entry.url)}" class="entry-link" target="_blank" title="${escapeHtml(entry.pageTitle || entry.url)}">
          ${escapeHtml(entry.pageTitle || entry.url)}
        </a>
      </div>
      <div class="entry-comment-section">
        <button class="comment-toggle">
          ${hasComment ? icons.edit : icons.comment}
          <span>${hasComment ? 'Edit comment' : 'Add comment'}</span>
        </button>
        ${hasComment ? `<div class="existing-comment">${escapeHtml(entry.comment)}</div>` : ''}
        <div class="comment-area hidden">
          <textarea class="comment-input" placeholder="Add your thoughts...">${escapeHtml(entry.comment || '')}</textarea>
          <div class="comment-actions">
            <button class="btn-primary">Save</button>
          </div>
        </div>
      </div>
    `;

    // Copy button handler
    const copyBtn = div.querySelector('.copy-btn');
    copyBtn.addEventListener('click', async () => {
      const text = entry.comment
        ? `${entry.text}\n\n— ${entry.comment}`
        : entry.text;
      try {
        await navigator.clipboard.writeText(text);
        copyBtn.innerHTML = icons.check;
        copyBtn.title = 'Copied!';
        copyBtn.classList.add('copied');
        setTimeout(() => {
          copyBtn.innerHTML = icons.copy;
          copyBtn.title = 'Copy';
          copyBtn.classList.remove('copied');
        }, 1500);
      } catch (err) {
        copyBtn.title = 'Copy failed';
      }
    });

    // Favourite button handler
    div.querySelector('.fav-btn').addEventListener('click', () => {
      toggleFavourite(entry.id);
    });

    // Delete button handler
    div.querySelector('.delete-btn').addEventListener('click', () => {
      deleteEntry(entry.id);
    });

    // Comment toggle handler
    const commentToggle = div.querySelector('.comment-toggle');
    const commentArea = div.querySelector('.comment-area');
    const existingComment = div.querySelector('.existing-comment');

    commentToggle.addEventListener('click', () => {
      commentArea.classList.toggle('hidden');
      if (existingComment) {
        existingComment.classList.toggle('hidden');
      }
    });

    // Save comment handler
    div.querySelector('.btn-primary').addEventListener('click', () => {
      const textarea = div.querySelector('.comment-input');
      saveComment(entry.id, textarea.value);
    });

    return div;
  }

  function createTrashElement(entry) {
    const div = document.createElement('div');
    div.className = 'entry trash-entry';
    div.dataset.id = entry.id;

    const formattedDate = formatRelativeDate(entry.date);
    const deletedDate = new Date(entry.deletedAt);
    const formattedDeletedDate = deletedDate.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });

    const hasTags = entry.tags && entry.tags.length > 0;

    div.innerHTML = `
      <div class="entry-header">
        <span class="entry-date">${formattedDate}<span class="deleted-date">Deleted ${formattedDeletedDate}</span></span>
      </div>
      <div class="entry-text">${escapeHtml(entry.text)}</div>
      ${hasTags ? `
        <div class="entry-tags">
          ${entry.tags.map(tag => `<span class="entry-tag">${escapeHtml(toTitleCase(tag))}</span>`).join('')}
        </div>
      ` : ''}
      <div class="entry-source">
        ${icons.link}
        <a href="${escapeHtml(entry.url)}" class="entry-link" target="_blank" title="${escapeHtml(entry.pageTitle || entry.url)}">
          ${escapeHtml(entry.pageTitle || entry.url)}
        </a>
      </div>
      ${entry.comment ? `<div class="existing-comment">${escapeHtml(entry.comment)}</div>` : ''}
      <div class="entry-actions">
        <button class="btn-success">${icons.restore} Restore</button>
        <button class="btn-outline btn-danger btn-sm">Delete</button>
      </div>
    `;

    div.querySelector('.btn-success').addEventListener('click', () => {
      restoreEntry(entry.id);
    });

    div.querySelector('.btn-danger').addEventListener('click', () => {
      permanentlyDeleteEntry(entry.id);
    });

    return div;
  }

  function toggleFavourite(id) {
    const entry = allEntries.find(e => e.id === id);
    if (entry) {
      entry.isFavourite = !entry.isFavourite;
      saveData(() => {
        applyFilters();
      });
    }
  }

  function deleteEntry(id) {
    const entry = allEntries.find(e => e.id === id);
    if (!entry) return;
    const maxTrash = getMaxTrashSize();
    const trashFull = !isPremiumUser && trashEntries.length >= maxTrash;
    if (trashFull) {
      showTrashLimitModal(maxTrash, () => performDelete(id));
      return;
    }
    performDelete(id);
  }

  function performDelete(id) {
    const entry = allEntries.find(e => e.id === id);
    if (!entry) return;
    const maxTrash = getMaxTrashSize();
    const trashedEntry = {
      ...entry,
      deletedAt: new Date().toISOString()
    };
    trashEntries.unshift(trashedEntry);

    if (trashEntries.length > maxTrash) {
      trashEntries = trashEntries.slice(0, maxTrash);
    }

    allEntries = allEntries.filter(e => e.id !== id);

    saveData(() => {
      applyFilters();
      updateTrashBadge();
      updateEntriesBadge();
    });
  }

  function showTrashLimitModal(maxTrash, onDeleteAnyway) {
    const overlay = document.createElement('div');
    overlay.className = 'trash-limit-overlay';
    overlay.innerHTML = `
      <div class="trash-limit-modal">
        <p class="trash-limit-message">
          The free plan allows only ${maxTrash} deleted entries. Deleting this will permanently remove the oldest item in trash.
        </p>
        <div class="trash-limit-actions">
          <a href="https://vamshimorlawar.github.io/my-diary-extension/upgrade.html" target="_blank" class="btn-primary trash-limit-upgrade">Upgrade to Pro</a>
          <button class="btn-outline trash-limit-delete">Delete anyway</button>
          <button class="trash-limit-cancel">Cancel</button>
        </div>
      </div>
    `;
    const close = () => overlay.remove();
    overlay.querySelector('.trash-limit-upgrade').addEventListener('click', (e) => {
      e.preventDefault();
      chrome.tabs.create({ url: 'https://vamshimorlawar.github.io/my-diary-extension/upgrade.html' });
      close();
    });
    overlay.querySelector('.trash-limit-delete').addEventListener('click', () => {
      close();
      onDeleteAnyway();
    });
    overlay.querySelector('.trash-limit-cancel').addEventListener('click', close);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
    document.body.appendChild(overlay);
  }

  function restoreEntry(id) {
    const entry = trashEntries.find(e => e.id === id);
    if (entry) {
      const { deletedAt, ...restoredEntry } = entry;
      allEntries.unshift(restoredEntry);
      trashEntries = trashEntries.filter(e => e.id !== id);
      
      saveData(() => {
        renderTrash();
        updateTrashBadge();
        updateEntriesBadge();
        populateTagFilter();
        populateFolderFilter();
      });
    }
  }

  function permanentlyDeleteEntry(id) {
    trashEntries = trashEntries.filter(e => e.id !== id);
    saveData(() => {
      renderTrash();
      updateTrashBadge();
    });
  }

  function saveComment(id, comment) {
    const entry = allEntries.find(e => e.id === id);
    if (entry) {
      entry.comment = comment;
      saveData(() => {
        applyFilters();
      });
    }
  }

  function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  function formatRelativeDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    let relative;
    if (diffMins < 1) relative = 'Just now';
    else if (diffMins < 60) relative = `${diffMins}m ago`;
    else if (diffHours < 24) relative = `${diffHours}h ago`;
    else if (diffDays < 7) relative = `${diffDays}d ago`;
    else relative = null;

    const absolute = date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
      hour: 'numeric',
      minute: '2-digit'
    });

    return relative ? `${relative} · ${absolute}` : absolute;
  }

  function toTitleCase(str) {
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
  }
});
