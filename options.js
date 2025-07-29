// Options page script for PassKey Manager
class OptionsManager {
  constructor() {
    this.settings = {};
    this.passkeys = {};
    this.init();
  }

  async init() {
    await this.loadSettings();
    this.setupEventListeners();
    this.updateUI();
    this.checkWebAuthnSupport();
    this.updatePasskeyCount();
  }

  async loadSettings() {
    try {
      const response = await chrome.runtime.sendMessage({ type: 'GET_SETTINGS' });
      if (response.success) {
        this.settings = response.data;
        this.passkeys = this.settings.passkeys || {};
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
      this.updateStatus('Error loading settings', 'error');
    }
  }

  setupEventListeners() {
    // Setting toggles and inputs
    document.getElementById('auto-login').addEventListener('change', (e) => {
      this.updateSetting('autoLogin', e.target.checked);
    });

    document.getElementById('notifications').addEventListener('change', (e) => {
      this.updateSetting('notifications', e.target.checked);
    });

    document.getElementById('auto-save').addEventListener('change', (e) => {
      this.updateSetting('autoSave', e.target.checked);
    });

    document.getElementById('user-verification').addEventListener('change', (e) => {
      this.updateSetting('userVerification', e.target.checked);
    });

    document.getElementById('debug-mode').addEventListener('change', (e) => {
      this.updateSetting('debugMode', e.target.checked);
    });

    document.getElementById('timeout').addEventListener('change', (e) => {
      this.updateSetting('timeout', parseInt(e.target.value));
    });

    document.getElementById('backup-frequency').addEventListener('change', (e) => {
      this.updateSetting('backupFrequency', e.target.value);
    });

    // Data management buttons
    document.getElementById('export-data').addEventListener('click', () => {
      this.exportData();
    });

    document.getElementById('import-data').addEventListener('click', () => {
      this.importData();
    });

    document.getElementById('clear-data').addEventListener('click', () => {
      this.clearAllData();
    });

    // Footer buttons
    document.getElementById('reset-settings').addEventListener('click', () => {
      this.resetSettings();
    });

    document.getElementById('save-settings').addEventListener('click', () => {
      this.saveSettings();
    });

    // About links
    document.getElementById('view-logs').addEventListener('click', (e) => {
      e.preventDefault();
      this.viewLogs();
    });

    document.getElementById('report-issue').addEventListener('click', (e) => {
      e.preventDefault();
      this.reportIssue();
    });

    document.getElementById('privacy-policy').addEventListener('click', (e) => {
      e.preventDefault();
      this.showPrivacyPolicy();
    });
  }

  updateUI() {
    // Update toggles
    document.getElementById('auto-login').checked = this.settings.autoLogin !== false;
    document.getElementById('notifications').checked = this.settings.notifications !== false;
    document.getElementById('auto-save').checked = this.settings.autoSave !== false;
    document.getElementById('user-verification').checked = this.settings.userVerification === true;
    document.getElementById('debug-mode').checked = this.settings.debugMode === true;

    // Update inputs
    document.getElementById('timeout').value = this.settings.timeout || 60;
    document.getElementById('backup-frequency').value = this.settings.backupFrequency || 'never';
  }

  async updateSetting(key, value) {
    this.settings[key] = value;
    
    try {
      const response = await chrome.runtime.sendMessage({
        type: 'UPDATE_SETTINGS',
        data: { [key]: value }
      });

      if (response.success) {
        this.updateStatus(`${this.formatSettingName(key)} updated`, 'success');
      } else {
        this.updateStatus('Failed to update setting', 'error');
      }
    } catch (error) {
      console.error('Failed to update setting:', error);
      this.updateStatus('Failed to update setting', 'error');
    }
  }

  async saveSettings() {
    try {
      const response = await chrome.runtime.sendMessage({
        type: 'UPDATE_SETTINGS',
        data: this.settings
      });

      if (response.success) {
        this.updateStatus('Settings saved successfully', 'success');
      } else {
        this.updateStatus('Failed to save settings', 'error');
      }
    } catch (error) {
      console.error('Failed to save settings:', error);
      this.updateStatus('Failed to save settings', 'error');
    }
  }

  async resetSettings() {
    if (!confirm('Are you sure you want to reset all settings to defaults? This will not delete your passkeys.')) {
      return;
    }

    const defaultSettings = {
      autoLogin: true,
      notifications: true,
      autoSave: true,
      userVerification: false,
      debugMode: false,
      timeout: 60,
      backupFrequency: 'never',
      passkeys: this.passkeys // Keep existing passkeys
    };

    try {
      const response = await chrome.runtime.sendMessage({
        type: 'UPDATE_SETTINGS',
        data: defaultSettings
      });

      if (response.success) {
        this.settings = defaultSettings;
        this.updateUI();
        this.updateStatus('Settings reset to defaults', 'success');
      } else {
        this.updateStatus('Failed to reset settings', 'error');
      }
    } catch (error) {
      console.error('Failed to reset settings:', error);
      this.updateStatus('Failed to reset settings', 'error');
    }
  }

  exportData() {
    const exportData = {
      settings: this.settings,
      passkeys: this.passkeys,
      exportDate: new Date().toISOString(),
      version: '1.0.0'
    };

    const dataStr = JSON.stringify(exportData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    
    const link = document.createElement('a');
    link.href = URL.createObjectURL(dataBlob);
    link.download = `passkey-manager-backup-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    
    this.updateStatus('Data exported successfully', 'success');
  }

  importData() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    
    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      
      try {
        const text = await file.text();
        const importData = JSON.parse(text);
        
        // Validate import data
        if (!importData.passkeys && !importData.settings) {
          throw new Error('Invalid backup file format');
        }

        // Merge settings
        if (importData.settings) {
          Object.assign(this.settings, importData.settings);
        }

        // Merge passkeys
        if (importData.passkeys) {
          Object.assign(this.passkeys, importData.passkeys);
          this.settings.passkeys = this.passkeys;
        }

        // Save to storage
        await chrome.runtime.sendMessage({
          type: 'UPDATE_SETTINGS',
          data: this.settings
        });
        
        this.updateUI();
        this.updatePasskeyCount();
        this.updateStatus('Data imported successfully', 'success');
      } catch (error) {
        console.error('Failed to import data:', error);
        this.updateStatus('Failed to import data: ' + error.message, 'error');
      }
    };
    
    input.click();
  }

  async clearAllData() {
    const confirmText = 'DELETE ALL DATA';
    const userInput = prompt(
      `This will permanently delete ALL passkeys and settings. This action cannot be undone.\n\nType "${confirmText}" to confirm:`
    );

    if (userInput !== confirmText) {
      this.updateStatus('Data clear cancelled', 'warning');
      return;
    }

    try {
      await chrome.storage.local.clear();
      
      this.settings = {};
      this.passkeys = {};
      
      this.updateUI();
      this.updatePasskeyCount();
      this.updateStatus('All data cleared successfully', 'success');
      
      // Reload page after a delay
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } catch (error) {
      console.error('Failed to clear data:', error);
      this.updateStatus('Failed to clear data', 'error');
    }
  }

  checkWebAuthnSupport() {
    const supportElement = document.getElementById('webauthn-support');
    
    if (window.PublicKeyCredential) {
      PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()
        .then(available => {
          if (available) {
            supportElement.textContent = 'Full Support (Platform Authenticator)';
            supportElement.className = 'success';
          } else {
            supportElement.textContent = 'Partial Support (External Authenticator)';
            supportElement.className = 'warning';
          }
        })
        .catch(() => {
          supportElement.textContent = 'Basic Support';
          supportElement.className = 'warning';
        });
    } else {
      supportElement.textContent = 'Not Supported';
      supportElement.className = 'error';
    }
  }

  updatePasskeyCount() {
    const count = Object.keys(this.passkeys).length;
    document.getElementById('passkey-count').textContent = count;
  }

  viewLogs() {
    // Create a simple log viewer modal
    const modal = document.createElement('div');
    modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.5);
      z-index: 1000;
      display: flex;
      align-items: center;
      justify-content: center;
    `;

    const dialog = document.createElement('div');
    dialog.style.cssText = `
      background: white;
      border-radius: 8px;
      padding: 24px;
      max-width: 600px;
      max-height: 400px;
      width: 90%;
      overflow-y: auto;
    `;

    dialog.innerHTML = `
      <h3>Debug Logs</h3>
      <p>Debug logging is ${this.settings.debugMode ? 'enabled' : 'disabled'}.</p>
      <p>Check the browser console (F12) for detailed logs.</p>
      <div style="margin-top: 16px; text-align: right;">
        <button class="btn btn-primary" onclick="this.closest('[style*=fixed]').remove()">Close</button>
      </div>
    `;

    modal.appendChild(dialog);
    document.body.appendChild(modal);
  }

  reportIssue() {
    const issueUrl = 'https://github.com/passkey-manager/issues/new';
    const body = encodeURIComponent(`
**Browser:** ${navigator.userAgent}
**Extension Version:** 1.0.0
**WebAuthn Support:** ${document.getElementById('webauthn-support').textContent}
**Passkey Count:** ${Object.keys(this.passkeys).length}

**Issue Description:**
Please describe the issue you're experiencing...

**Steps to Reproduce:**
1. 
2. 
3. 

**Expected Behavior:**

**Actual Behavior:**
    `.trim());

    window.open(`${issueUrl}?body=${body}`, '_blank');
  }

  showPrivacyPolicy() {
    const modal = document.createElement('div');
    modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.5);
      z-index: 1000;
      display: flex;
      align-items: center;
      justify-content: center;
    `;

    const dialog = document.createElement('div');
    dialog.style.cssText = `
      background: white;
      border-radius: 8px;
      padding: 24px;
      max-width: 600px;
      max-height: 500px;
      width: 90%;
      overflow-y: auto;
    `;

    dialog.innerHTML = `
      <h3>Privacy Policy</h3>
      <div style="margin: 16px 0; line-height: 1.6;">
        <p><strong>PassKey Manager Privacy Policy</strong></p>
        <p>This extension stores all data locally on your device. No data is transmitted to external servers.</p>
        <ul style="margin: 12px 0; padding-left: 20px;">
          <li>Passkeys are stored locally using Chrome's storage API</li>
          <li>No analytics or tracking is performed</li>
          <li>No data is shared with third parties</li>
          <li>All WebAuthn operations are handled by your browser</li>
        </ul>
        <p>You can export or delete your data at any time using the options above.</p>
      </div>
      <div style="margin-top: 16px; text-align: right;">
        <button class="btn btn-primary" onclick="this.closest('[style*=fixed]').remove()">Close</button>
      </div>
    `;

    modal.appendChild(dialog);
    document.body.appendChild(modal);
  }

  formatSettingName(key) {
    return key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
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
    
    // Auto-clear status after 5 seconds
    setTimeout(() => {
      if (statusText.textContent === message) {
        statusText.textContent = 'Settings loaded';
        statusIndicator.classList.remove('error', 'warning');
      }
    }, 5000);
  }
}

// Initialize options page when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new OptionsManager();
});