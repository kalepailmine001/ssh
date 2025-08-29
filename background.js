// Background service worker for PassKey Manager
class PassKeyManager {
  constructor() {
    this.setupEventListeners();
  }

  setupEventListeners() {
    // Handle extension installation
    chrome.runtime.onInstalled.addListener((details) => {
      if (details.reason === 'install') {
        this.initializeStorage();
      }
    });

    // Handle messages from content scripts and popup
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      this.handleMessage(message, sender, sendResponse);
      return true; // Keep message channel open for async responses
    });

    // Handle tab updates to check for login opportunities
    chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
      if (changeInfo.status === 'complete' && tab.url) {
        this.checkForAutoLogin(tab);
      }
    });
  }

  async initializeStorage() {
    const defaultSettings = {
      autoLogin: true,
      notifications: true,
      passkeys: {},
      sites: {}
    };
    
    try {
      const existing = await chrome.storage.local.get(['settings']);
      if (!existing.settings) {
        await chrome.storage.local.set({ settings: defaultSettings });
      }
    } catch (error) {
      console.error('Failed to initialize storage:', error);
    }
  }

  async handleMessage(message, sender, sendResponse) {
    try {
      switch (message.type) {
        case 'GET_PASSKEYS':
          const passkeys = await this.getPasskeys();
          sendResponse({ success: true, data: passkeys });
          break;

        case 'SAVE_PASSKEY':
          await this.savePasskey(message.data);
          sendResponse({ success: true });
          break;

        case 'DELETE_PASSKEY':
          await this.deletePasskey(message.data.id);
          sendResponse({ success: true });
          break;

        case 'GET_SETTINGS':
          const settings = await this.getSettings();
          sendResponse({ success: true, data: settings });
          break;

        case 'UPDATE_SETTINGS':
          await this.updateSettings(message.data);
          sendResponse({ success: true });
          break;

        case 'CHECK_SITE_PASSKEYS':
          const sitePasskeys = await this.getSitePasskeys(message.data.domain);
          sendResponse({ success: true, data: sitePasskeys });
          break;

        case 'WEBAUTHN_CREATE':
          const createResult = await this.handleWebAuthnCreate(message.data, sender.tab);
          sendResponse(createResult);
          break;

        case 'WEBAUTHN_GET':
          const getResult = await this.handleWebAuthnGet(message.data, sender.tab);
          sendResponse(getResult);
          break;

        case 'UPDATE_PASSKEY_USAGE':
          await this.updatePasskeyUsage(message.data.id);
          sendResponse({ success: true });
          break;

        case 'SAVE_CREATED_PASSKEY':
          await this.saveCreatedPasskey(message.data);
          sendResponse({ success: true });
          break;

        default:
          sendResponse({ success: false, error: 'Unknown message type' });
      }
    } catch (error) {
      console.error('Error handling message:', error);
      sendResponse({ success: false, error: error.message });
    }
  }

  async getPasskeys() {
    const { settings } = await chrome.storage.local.get(['settings']);
    return settings?.passkeys || {};
  }

  async savePasskey(passkeyData) {
    const { settings } = await chrome.storage.local.get(['settings']);
    const passkeys = settings?.passkeys || {};
    
    const passkeyId = passkeyData.id || this.generateId();
    passkeys[passkeyId] = {
      ...passkeyData,
      id: passkeyId,
      createdAt: Date.now(),
      lastUsed: null
    };

    await chrome.storage.local.set({
      settings: { ...settings, passkeys }
    });
  }

  async deletePasskey(passkeyId) {
    const { settings } = await chrome.storage.local.get(['settings']);
    const passkeys = settings?.passkeys || {};
    
    delete passkeys[passkeyId];
    
    await chrome.storage.local.set({
      settings: { ...settings, passkeys }
    });
  }

  async getSettings() {
    const { settings } = await chrome.storage.local.get(['settings']);
    return settings || {};
  }

  async updateSettings(newSettings) {
    const { settings } = await chrome.storage.local.get(['settings']);
    const updatedSettings = { ...settings, ...newSettings };
    await chrome.storage.local.set({ settings: updatedSettings });
  }

  async getSitePasskeys(domain) {
    const passkeys = await this.getPasskeys();
    return Object.values(passkeys).filter(passkey => 
      passkey.domain === domain || passkey.rpId === domain
    );
  }

  async handleWebAuthnCreate(options, tab) {
    try {
      // Store the passkey creation request
      const domain = new URL(tab.url).hostname;
      const passkeyData = {
        domain,
        rpId: options.rp?.id || domain,
        rpName: options.rp?.name || domain,
        userName: options.user?.name || 'Unknown',
        userDisplayName: options.user?.displayName || options.user?.name || 'Unknown',
        userId: options.user?.id,
        credentialId: null, // Will be filled after creation
        publicKey: null, // Will be filled after creation
        type: 'webauthn'
      };

      // The actual WebAuthn creation will be handled by the content script
      return { success: true, data: passkeyData };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async handleWebAuthnGet(options, tab) {
    try {
      const domain = new URL(tab.url).hostname;
      const sitePasskeys = await this.getSitePasskeys(domain);
      
      return { success: true, data: { passkeys: sitePasskeys, options } };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async checkForAutoLogin(tab) {
    const settings = await this.getSettings();
    if (!settings.autoLogin) return;

    try {
      const domain = new URL(tab.url).hostname;
      const sitePasskeys = await this.getSitePasskeys(domain);
      
      if (sitePasskeys.length > 0) {
        // Inject auto-login script
        chrome.scripting.executeScript({
          target: { tabId: tab.id },
          func: this.injectAutoLoginScript,
          args: [sitePasskeys]
        });
      }
    } catch (error) {
      console.error('Error checking for auto-login:', error);
    }
  }

  injectAutoLoginScript(passkeys) {
    // This function runs in the page context
    if (window.passkeyManagerInjected) return;
    window.passkeyManagerInjected = true;

    // Look for login forms or WebAuthn triggers
    const loginForms = document.querySelectorAll('form[action*="login"], form[action*="signin"], form[action*="auth"]');
    const loginButtons = document.querySelectorAll('button[type="submit"], input[type="submit"], .login-btn, .signin-btn, #login, #signin');
    
    if (loginForms.length > 0 || loginButtons.length > 0) {
      // Show passkey login option
      window.postMessage({
        type: 'PASSKEY_MANAGER_AUTO_LOGIN',
        passkeys: passkeys
      }, '*');
    }
  }

  async updatePasskeyUsage(passkeyId) {
    const { settings } = await chrome.storage.local.get(['settings']);
    const passkeys = settings?.passkeys || {};
    
    if (passkeys[passkeyId]) {
      passkeys[passkeyId].lastUsed = Date.now();
      
      await chrome.storage.local.set({
        settings: { ...settings, passkeys }
      });
    }
  }

  async saveCreatedPasskey(passkeyData) {
    // This is called after a passkey is successfully created
    const passkeyId = this.generateId();
    const completePasskeyData = {
      ...passkeyData,
      id: passkeyId,
      createdAt: Date.now(),
      lastUsed: null
    };

    await this.savePasskey(completePasskeyData);
    
    // Show notification if enabled
    const settings = await this.getSettings();
    if (settings.notifications) {
      chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icons/icon48.png',
        title: 'PassKey Manager',
        message: `Passkey created for ${passkeyData.domain}`
      });
    }
  }

  generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }
}

// Initialize the PassKey Manager
new PassKeyManager();