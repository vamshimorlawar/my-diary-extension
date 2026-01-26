// Prevent multiple injections
if (!window.myDiaryInjected) {
  window.myDiaryInjected = true;

  const DEFAULT_TAGS = ["text", "link", "quote", "code", "idea", "todo"];

  const icons = {
    book: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>`,
    x: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>`,
    plus: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12h14"/></svg>`,
    check: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>`
  };

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "showDiaryModal") {
      showModal(message.data);
    }
  });

  function showModal(data) {
    const existing = document.getElementById("my-diary-modal-overlay");
    if (existing) existing.remove();

    chrome.runtime.sendMessage({ action: "getCustomTags" }, (response) => {
      const customTags = response?.tags || [];
      createModal(data, customTags);
    });
  }

  function createModal(data, customTags) {
    const allTags = [...DEFAULT_TAGS, ...customTags];

    const overlay = document.createElement("div");
    overlay.id = "my-diary-modal-overlay";
    overlay.innerHTML = `
      <div class="my-diary-modal">
        <div class="my-diary-header">
          <div class="my-diary-header-title">
            ${icons.book}
            <span>Add to My Diary</span>
          </div>
          <button class="my-diary-close">${icons.x}</button>
        </div>
        
        <div class="my-diary-content">
          <div class="my-diary-field">
            <label>Selected text</label>
            <div class="my-diary-selected-text">${escapeHtml(data.text)}</div>
          </div>

          <div class="my-diary-field">
            <label>Source</label>
            <div class="my-diary-source">${escapeHtml(data.pageTitle || data.url)}</div>
          </div>

          <div class="my-diary-field">
            <label>Tags</label>
            <div class="my-diary-tags-list">
              ${allTags.map(tag => `
                <button type="button" class="my-diary-tag-btn" data-tag="${escapeHtml(tag)}">${escapeHtml(toTitleCase(tag))}</button>
              `).join("")}
            </div>
            <div class="my-diary-custom-tag">
              <input type="text" id="my-diary-new-tag" placeholder="Custom tag...">
              <button type="button" id="my-diary-add-tag">${icons.plus}</button>
            </div>
          </div>

          <div class="my-diary-field">
            <label>Comment <span class="my-diary-optional">(optional)</span></label>
            <textarea id="my-diary-comment" placeholder="Add a note..."></textarea>
          </div>
        </div>

        <div class="my-diary-footer">
          <button class="my-diary-btn my-diary-btn-cancel">Cancel</button>
          <button class="my-diary-btn my-diary-btn-save">Save</button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    let selectedTags = [];

    const closeModal = () => overlay.remove();

    overlay.querySelector(".my-diary-close").addEventListener("click", closeModal);
    overlay.querySelector(".my-diary-btn-cancel").addEventListener("click", closeModal);
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) closeModal();
    });

    // Tag selection
    overlay.querySelectorAll(".my-diary-tag-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        const tag = btn.dataset.tag;
        if (selectedTags.includes(tag)) {
          selectedTags = selectedTags.filter(t => t !== tag);
          btn.classList.remove("selected");
        } else {
          selectedTags.push(tag);
          btn.classList.add("selected");
        }
      });
    });

    // Add custom tag
    const newTagInput = overlay.querySelector("#my-diary-new-tag");
    overlay.querySelector("#my-diary-add-tag").addEventListener("click", () => {
      addCustomTag();
    });
    newTagInput.addEventListener("keypress", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        addCustomTag();
      }
    });

    function addCustomTag() {
      const tag = newTagInput.value.trim().toLowerCase();
      if (tag && !selectedTags.includes(tag)) {
        const tagBtn = document.createElement("button");
        tagBtn.type = "button";
        tagBtn.className = "my-diary-tag-btn selected";
        tagBtn.dataset.tag = tag;
        tagBtn.textContent = toTitleCase(tag);
        tagBtn.addEventListener("click", () => {
          if (selectedTags.includes(tag)) {
            selectedTags = selectedTags.filter(t => t !== tag);
            tagBtn.classList.remove("selected");
          } else {
            selectedTags.push(tag);
            tagBtn.classList.add("selected");
          }
        });
        overlay.querySelector(".my-diary-tags-list").appendChild(tagBtn);
        
        selectedTags.push(tag);
        newTagInput.value = "";
      }
    }

    // Save entry
    overlay.querySelector(".my-diary-btn-save").addEventListener("click", () => {
      const comment = overlay.querySelector("#my-diary-comment").value;
      
      chrome.runtime.sendMessage({
        action: "saveDiaryEntry",
        data: {
          text: data.text,
          url: data.url,
          pageTitle: data.pageTitle,
          tags: selectedTags,
          comment: comment
        }
      }, (response) => {
        if (response?.success) {
          const modal = overlay.querySelector(".my-diary-modal");
          modal.innerHTML = `
            <div class="my-diary-success">
              <div class="my-diary-success-icon">${icons.check}</div>
              <p>Saved</p>
            </div>
          `;
          setTimeout(closeModal, 800);
        }
      });
    });

    document.addEventListener("keydown", function escHandler(e) {
      if (e.key === "Escape") {
        closeModal();
        document.removeEventListener("keydown", escHandler);
      }
    });
  }

  function escapeHtml(text) {
    if (!text) return "";
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }

  function toTitleCase(str) {
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
  }
}
