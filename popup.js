// Popup script for PassKey Manager
class PopupManager {
  constructor() {
    this.currentTab = null;
    this.passkeys = {};
    this.filteredPasskeys = {};
    this.init();
  }

  async init() {
    await this.loadData();
    this.setupEventListeners();
    this.setupTabs();
    await this.getCurrentTab();
    this.renderPasskeys();
    this.updateCurrentSite();
  }

  async loadData() {
    try {
      const response = await chrome.runtime.sendMessage({ type: 'GET_PASSKEYS' });
      if (response.success) {
        this.passkeys = response.data;
        this.filteredPasskeys = { ...this.passkeys };
      }
    } catch (error) {
      console.error('Failed to load passkeys:', error);
      this.updateStatus('Error loading passkeys', 'error');
    }
  }

  setupEventListeners() {
    // Tab switching
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        this.switchTab(e.target.dataset.tab);
      });
    });

    // Search functionality
    const searchInput = document.getElementById('search-input');
    searchInput.addEventListener('input', (e) => {
      this.filterPasskeys(e.target.value);
    });

    // Settings button
    document.getElementById('settings-btn').addEventListener('click', () => {
      chrome.runtime.openOptionsPage();
    });

    // Export/Import buttons
    document.getElementById('export-btn').addEventListener('click', () => {
      this.exportPasskeys();
    });

    document.getElementById('import-btn').addEventListener('click', () => {
      this.importPasskeys();
    });

    // Current site actions
    document.getElementById('create-passkey-btn').addEventListener('click', () => {
      this.createPasskey();
    });

    document.getElementById('test-login-btn').addEventListener('click', () => {
      this.testLogin();
    });
  }

  setupTabs() {
    // Initialize tab switching
    this.switchTab('passkeys');
  }

  switchTab(tabName) {
    // Update tab buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.classList.remove('active');
    });
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');

    // Update tab panels
    document.querySelectorAll('.tab-panel').forEach(panel => {
      panel.classList.remove('active');
    });
    document.getElementById(`${tabName}-tab`).classList.add('active');

    if (tabName === 'current-site') {
      this.updateCurrentSite();
    }
  }

  async getCurrentTab() {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      this.currentTab = tab;
    } catch (error) {
      console.error('Failed to get current tab:', error);
    }
  }

  filterPasskeys(query) {
    if (!query.trim()) {
      this.filteredPasskeys = { ...this.passkeys };
    } else {
      const lowerQuery = query.toLowerCase();
      this.filteredPasskeys = {};
      
      Object.entries(this.passkeys).forEach(([id, passkey]) => {
        const searchText = `${passkey.userDisplayName} ${passkey.userName} ${passkey.domain} ${passkey.rpName}`.toLowerCase();
        if (searchText.includes(lowerQuery)) {
          this.filteredPasskeys[id] = passkey;
        }
      });
    }
    
    this.renderPasskeys();
  }

  renderPasskeys() {
    const passkeyList = document.getElementById('passkey-list');
    const emptyState = document.getElementById('empty-state');
    
    const passkeyEntries = Object.entries(this.filteredPasskeys);
    
    if (passkeyEntries.length === 0) {
      emptyState.style.display = 'block';
      passkeyList.innerHTML = '';
      passkeyList.appendChild(emptyState);
      return;
    }

    emptyState.style.display = 'none';
    
    passkeyList.innerHTML = passkeyEntries.map(([id, passkey]) => `
      <div class="passkey-item" data-id="${id}">
        <div class="passkey-icon">
          ${this.getPasskeyIcon(passkey.domain)}
        </div>
        <div class="passkey-info">
          <div class="passkey-name">${this.escapeHtml(passkey.userDisplayName)}</div>
          <div class="passkey-details">
            <span class="passkey-domain">${this.escapeHtml(passkey.domain)}</span>
            <span class="passkey-date">${this.formatDate(passkey.createdAt)}</span>
          </div>
        </div>
        <div class="passkey-actions">
          <button class="action-btn edit" data-action="edit" data-id="${id}" title="Edit">
            ✏️
          </button>
          <button class="action-btn delete" data-action="delete" data-id="${id}" title="Delete">
            🗑️
          </button>
        </div>
      </div>
    `).join('');

    // Add event listeners to action buttons
    passkeyList.querySelectorAll('.action-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const action = e.target.dataset.action;
        const id = e.target.dataset.id;
        
        if (action === 'edit') {
          this.editPasskey(id);
        } else if (action === 'delete') {
          this.deletePasskey(id);
        }
      });
    });

    // Add click listeners to passkey items
    passkeyList.querySelectorAll('.passkey-item').forEach(item => {
      item.addEventListener('click', (e) => {
        if (!e.target.classList.contains('action-btn')) {
          const id = item.dataset.id;
          this.usePasskey(id);
        }
      });
    });
  }

  async updateCurrentSite() {
    if (!this.currentTab || !this.currentTab.url) {
      document.getElementById('site-name').textContent = 'No active tab';
      document.getElementById('site-url').textContent = '';
      return;
    }

    try {
      const url = new URL(this.currentTab.url);
      const domain = url.hostname;
      
      document.getElementById('site-name').textContent = domain;
      document.getElementById('site-url').textContent = this.currentTab.url;

      // Get passkeys for current site
      const response = await chrome.runtime.sendMessage({
        type: 'CHECK_SITE_PASSKEYS',
        data: { domain }
      });

      if (response.success) {
        this.renderSitePasskeys(response.data);
      }
    } catch (error) {
      console.error('Failed to update current site:', error);
      document.getElementById('site-name').textContent = 'Invalid URL';
    }
  }

  renderSitePasskeys(sitePasskeys) {
    const sitePasskeyList = document.getElementById('site-passkey-list');
    
    if (sitePasskeys.length === 0) {
      sitePasskeyList.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">🔐</div>
          <h3>No Passkeys for This Site</h3>
          <p>Create a new passkey to enable secure login.</p>
        </div>
      `;
      return;
    }

    sitePasskeyList.innerHTML = sitePasskeys.map(passkey => `
      <div class="passkey-item" data-id="${passkey.id}">
        <div class="passkey-icon">
          ${this.getPasskeyIcon(passkey.domain)}
        </div>
        <div class="passkey-info">
          <div class="passkey-name">${this.escapeHtml(passkey.userDisplayName)}</div>
          <div class="passkey-details">
            <span class="passkey-domain">${this.escapeHtml(passkey.userName)}</span>
            <span class="passkey-date">${this.formatDate(passkey.createdAt)}</span>
          </div>
        </div>
        <div class="passkey-actions">
          <button class="action-btn edit" data-action="use" data-id="${passkey.id}" title="Use">
            🚀
          </button>
          <button class="action-btn delete" data-action="delete" data-id="${passkey.id}" title="Delete">
            🗑️
          </button>
        </div>
      </div>
    `).join('');

    // Add event listeners
    sitePasskeyList.querySelectorAll('.action-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const action = e.target.dataset.action;
        const id = e.target.dataset.id;
        
        if (action === 'use') {
          this.usePasskey(id);
        } else if (action === 'delete') {
          this.deletePasskey(id);
        }
      });
    });
  }

  getPasskeyIcon(domain) {
    // Return emoji based on domain
    const icons = {
      'github.com': '🐙',
      'google.com': '🔍',
      'microsoft.com': '🪟',
      'apple.com': '🍎',
      'facebook.com': '📘',
      'twitter.com': '🐦',
      'linkedin.com': '💼',
      'amazon.com': '📦',
      'netflix.com': '🎬',
      'spotify.com': '🎵'
    };
    
    return icons[domain] || '🔑';
  }

  formatDate(timestamp) {
    if (!timestamp) return 'Unknown';
    
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
    
    return `${Math.floor(diffDays / 365)} years ago`;
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  async usePasskey(id) {
    try {
      if (!this.currentTab) {
        this.updateStatus('No active tab', 'error');
        return;
      }

      // Inject content script to trigger passkey usage
      await chrome.scripting.executeScript({
        target: { tabId: this.currentTab.id },
        func: (passkeyId) => {
          window.postMessage({
            type: 'USE_PASSKEY',
            passkeyId: passkeyId
          }, '*');
        },
        args: [id]
      });

      this.updateStatus('Passkey activated', 'success');
      window.close();
    } catch (error) {
      console.error('Failed to use passkey:', error);
      this.updateStatus('Failed to use passkey', 'error');
    }
  }

  async deletePasskey(id) {
    if (!confirm('Are you sure you want to delete this passkey?')) {
      return;
    }

    try {
      const response = await chrome.runtime.sendMessage({
        type: 'DELETE_PASSKEY',
        data: { id }
      });

      if (response.success) {
        delete this.passkeys[id];
        delete this.filteredPasskeys[id];
        this.renderPasskeys();
        this.updateCurrentSite();
        this.updateStatus('Passkey deleted', 'success');
      } else {
        this.updateStatus('Failed to delete passkey', 'error');
      }
    } catch (error) {
      console.error('Failed to delete passkey:', error);
      this.updateStatus('Failed to delete passkey', 'error');
    }
  }

  editPasskey(id) {
    // For now, just show an alert. In a full implementation, 
    // this would open an edit dialog
    alert('Edit functionality coming soon!');
  }

  async createPasskey() {
    try {
      if (!this.currentTab) {
        this.updateStatus('No active tab', 'error');
        return;
      }

      // Inject script to trigger WebAuthn create
      await chrome.scripting.executeScript({
        target: { tabId: this.currentTab.id },
        func: () => {
          // Trigger WebAuthn create with default options
          const options = {
            publicKey: {
              challenge: crypto.getRandomValues(new Uint8Array(32)),
              rp: {
                name: document.title || window.location.hostname,
                id: window.location.hostname
              },
              user: {
                id: crypto.getRandomValues(new Uint8Array(16)),
                name: 'user@' + window.location.hostname,
                displayName: 'User'
              },
              pubKeyCredParams: [
                { type: 'public-key', alg: -7 },
                { type: 'public-key', alg: -257 }
              ],
              timeout: 60000,
              attestation: 'direct'
            }
          };

          navigator.credentials.create(options)
            .then(credential => {
              console.log('Passkey created:', credential);
              alert('Passkey created successfully!');
            })
            .catch(error => {
              console.error('Failed to create passkey:', error);
              alert('Failed to create passkey: ' + error.message);
            });
        }
      });

      this.updateStatus('Creating passkey...', 'warning');
      window.close();
    } catch (error) {
      console.error('Failed to create passkey:', error);
      this.updateStatus('Failed to create passkey', 'error');
    }
  }

  async testLogin() {
    try {
      if (!this.currentTab) {
        this.updateStatus('No active tab', 'error');
        return;
      }

      // Get passkeys for current site
      const url = new URL(this.currentTab.url);
      const domain = url.hostname;
      
      const response = await chrome.runtime.sendMessage({
        type: 'CHECK_SITE_PASSKEYS',
        data: { domain }
      });

      if (response.success && response.data.length > 0) {
        // Use the first available passkey
        await this.usePasskey(response.data[0].id);
      } else {
        this.updateStatus('No passkeys available for this site', 'warning');
      }
    } catch (error) {
      console.error('Failed to test login:', error);
      this.updateStatus('Failed to test login', 'error');
    }
  }

  exportPasskeys() {
    const dataStr = JSON.stringify(this.passkeys, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    
    const link = document.createElement('a');
    link.href = URL.createObjectURL(dataBlob);
    link.download = 'passkeys-export.json';
    link.click();
    
    this.updateStatus('Passkeys exported', 'success');
  }

  importPasskeys() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    
    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      
      try {
        const text = await file.text();
        const importedPasskeys = JSON.parse(text);
        
        // Merge with existing passkeys
        Object.assign(this.passkeys, importedPasskeys);
        this.filteredPasskeys = { ...this.passkeys };
        
        // Save to storage
        await chrome.runtime.sendMessage({
          type: 'UPDATE_SETTINGS',
          data: { passkeys: this.passkeys }
        });
        
        this.renderPasskeys();
        this.updateStatus('Passkeys imported', 'success');
      } catch (error) {
        console.error('Failed to import passkeys:', error);
        this.updateStatus('Failed to import passkeys', 'error');
      }
    };
    
    input.click();
  }

  updateStatus(message, type = 'info') {
    const statusText = document.getElementById('status-text');
    const statusIndicator = document.querySelector('.status-indicator');
    
    statusText.textContent = message;
    
    // Remove existing status classes
    statusIndicator.classList.remove('error', 'warning');
    
    if (type === 'error') {
      statusIndicator.classList.add('error');
    } else if (type === 'warning') {
      statusIndicator.classList.add('warning');
    }
    
    // Auto-clear status after 3 seconds
    setTimeout(() => {
      if (statusText.textContent === message) {
        statusText.textContent = 'Ready';
        statusIndicator.classList.remove('error', 'warning');
      }
    }, 3000);
  }
}

// Initialize popup when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new PopupManager();
});