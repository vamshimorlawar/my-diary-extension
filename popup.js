document.addEventListener('DOMContentLoaded', () => {
  const entriesContainer = document.getElementById('entriesContainer');
  const trashContainer = document.getElementById('trashContainer');
  const searchInput = document.getElementById('searchInput');
  const clearAllBtn = document.getElementById('clearAllBtn');
  const emptyTrashBtn = document.getElementById('emptyTrashBtn');
  const entriesControls = document.getElementById('entriesControls');
  const trashControls = document.getElementById('trashControls');
  const trashCountBadge = document.getElementById('trashCount');
  const filterBar = document.getElementById('filterBar');
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
    x: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>`
  };

  let allEntries = [];
  let trashEntries = [];
  let customTags = [];
  let currentTab = 'entries';
  let filterByFavourites = false;

  const MAX_TRASH_SIZE = 5;
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
    
    if (tabName === 'entries') {
      entriesContainer.classList.remove('hidden');
      trashContainer.classList.add('hidden');
      entriesControls.classList.remove('hidden');
      filterBar.classList.remove('hidden');
      trashControls.classList.add('hidden');
      applyFilters();
    } else {
      entriesContainer.classList.add('hidden');
      trashContainer.classList.remove('hidden');
      entriesControls.classList.add('hidden');
      filterBar.classList.add('hidden');
      trashControls.classList.remove('hidden');
      renderTrash();
    }
  }

  // Search functionality
  searchInput.addEventListener('input', () => {
    applyFilters();
  });

  // Tag filter
  tagFilter.addEventListener('change', () => {
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
      trashEntries = [...entriesToTrash, ...trashEntries].slice(0, MAX_TRASH_SIZE);
      allEntries = [];
      
      saveData(() => {
        renderEntries([]);
        updateTrashBadge();
      });
    }
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
    chrome.storage.local.get(['diaryEntries', 'trashEntries', 'customTags'], (result) => {
      allEntries = result.diaryEntries || [];
      trashEntries = result.trashEntries || [];
      customTags = result.customTags || [];
      
      populateTagFilter();
      applyFilters();
      updateTrashBadge();
    });
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

  function updateTrashBadge() {
    if (trashEntries.length > 0) {
      trashCountBadge.textContent = trashEntries.length;
      trashCountBadge.classList.remove('hidden');
    } else {
      trashCountBadge.classList.add('hidden');
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
    const isFav = entry.isFavourite;

    div.innerHTML = `
      <div class="entry-header">
        <div class="entry-header-left">
          <span class="entry-date">${formattedDate}</span>
        </div>
        <div class="entry-header-right">
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
    if (entry) {
      const trashedEntry = {
        ...entry,
        deletedAt: new Date().toISOString()
      };
      trashEntries.unshift(trashedEntry);
      
      if (trashEntries.length > MAX_TRASH_SIZE) {
        trashEntries = trashEntries.slice(0, MAX_TRASH_SIZE);
      }
      
      allEntries = allEntries.filter(e => e.id !== id);
      
      saveData(() => {
        applyFilters();
        updateTrashBadge();
      });
    }
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
        populateTagFilter();
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
