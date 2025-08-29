// Content script for PassKey Manager
class PassKeyContentScript {
  constructor() {
    this.setupWebAuthnInterception();
    this.setupMessageListeners();
    this.injectPageScript();
  }

  setupWebAuthnInterception() {
    // Inject script to intercept WebAuthn calls
    const script = document.createElement('script');
    script.src = chrome.runtime.getURL('injected.js');
    script.onload = () => script.remove();
    (document.head || document.documentElement).appendChild(script);
  }

  setupMessageListeners() {
    // Listen for messages from the injected script
    window.addEventListener('message', (event) => {
      if (event.source !== window) return;
      
      if (event.data.type === 'WEBAUTHN_CREATE_REQUEST') {
        this.handleWebAuthnCreate(event.data.options, event.data.requestId);
      } else if (event.data.type === 'WEBAUTHN_GET_REQUEST') {
        this.handleWebAuthnGet(event.data.options, event.data.requestId);
      } else if (event.data.type === 'PASSKEY_MANAGER_AUTO_LOGIN') {
        this.showAutoLoginPrompt(event.data.passkeys);
      } else if (event.data.type === 'SAVE_CREATED_PASSKEY') {
        this.handleSaveCreatedPasskey(event.data.data);
      } else if (event.data.type === 'USE_PASSKEY') {
        this.handleUsePasskey(event.data.passkeyId);
      }
    });

    // Listen for messages from background script
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (message.type === 'TRIGGER_AUTO_LOGIN') {
        this.triggerAutoLogin(message.data);
      }
    });
  }

  async handleWebAuthnCreate(options, requestId) {
    try {
      // Send to background script for processing
      const response = await chrome.runtime.sendMessage({
        type: 'WEBAUTHN_CREATE',
        data: options
      });

      if (response.success) {
        // Let the original WebAuthn call proceed
        window.postMessage({
          type: 'WEBAUTHN_CREATE_RESPONSE',
          requestId,
          success: true,
          data: response.data
        }, '*');
      } else {
        window.postMessage({
          type: 'WEBAUTHN_CREATE_RESPONSE',
          requestId,
          success: false,
          error: response.error
        }, '*');
      }
    } catch (error) {
      window.postMessage({
        type: 'WEBAUTHN_CREATE_RESPONSE',
        requestId,
        success: false,
        error: error.message
      }, '*');
    }
  }

  async handleWebAuthnGet(options, requestId) {
    try {
      const response = await chrome.runtime.sendMessage({
        type: 'WEBAUTHN_GET',
        data: options
      });

      if (response.success && response.data.passkeys.length > 0) {
        // Show passkey selection UI
        this.showPasskeySelection(response.data.passkeys, requestId);
      } else {
        // Let the original WebAuthn call proceed
        window.postMessage({
          type: 'WEBAUTHN_GET_RESPONSE',
          requestId,
          success: true,
          useOriginal: true
        }, '*');
      }
    } catch (error) {
      window.postMessage({
        type: 'WEBAUTHN_GET_RESPONSE',
        requestId,
        success: false,
        error: error.message
      }, '*');
    }
  }

  showPasskeySelection(passkeys, requestId) {
    // Create modal for passkey selection
    const modal = document.createElement('div');
    modal.id = 'passkey-manager-modal';
    modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.5);
      z-index: 10000;
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    `;

    const dialog = document.createElement('div');
    dialog.style.cssText = `
      background: white;
      border-radius: 8px;
      padding: 24px;
      max-width: 400px;
      width: 90%;
      box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
    `;

    dialog.innerHTML = `
      <h3 style="margin: 0 0 16px 0; color: #333;">Select Passkey</h3>
      <div id="passkey-list"></div>
      <div style="margin-top: 16px; text-align: right;">
        <button id="cancel-passkey" style="margin-right: 8px; padding: 8px 16px; border: 1px solid #ddd; background: white; border-radius: 4px; cursor: pointer;">Cancel</button>
      </div>
    `;

    const passkeyList = dialog.querySelector('#passkey-list');
    passkeys.forEach((passkey, index) => {
      const item = document.createElement('div');
      item.style.cssText = `
        padding: 12px;
        border: 1px solid #ddd;
        border-radius: 4px;
        margin-bottom: 8px;
        cursor: pointer;
        transition: background-color 0.2s;
      `;
      item.innerHTML = `
        <div style="font-weight: 500;">${passkey.userDisplayName}</div>
        <div style="font-size: 12px; color: #666;">${passkey.userName} • ${passkey.domain}</div>
      `;
      
      item.addEventListener('click', () => {
        this.selectPasskey(passkey, requestId);
        modal.remove();
      });

      item.addEventListener('mouseenter', () => {
        item.style.backgroundColor = '#f5f5f5';
      });

      item.addEventListener('mouseleave', () => {
        item.style.backgroundColor = 'white';
      });

      passkeyList.appendChild(item);
    });

    dialog.querySelector('#cancel-passkey').addEventListener('click', () => {
      modal.remove();
      window.postMessage({
        type: 'WEBAUTHN_GET_RESPONSE',
        requestId,
        success: false,
        error: 'User cancelled'
      }, '*');
    });

    modal.appendChild(dialog);
    document.body.appendChild(modal);
  }

  selectPasskey(passkey, requestId) {
    // Update last used timestamp
    chrome.runtime.sendMessage({
      type: 'UPDATE_PASSKEY_USAGE',
      data: { id: passkey.id }
    });

    // Send selected passkey back to page
    window.postMessage({
      type: 'WEBAUTHN_GET_RESPONSE',
      requestId,
      success: true,
      passkey: passkey
    }, '*');
  }

  showAutoLoginPrompt(passkeys) {
    if (document.getElementById('passkey-auto-login-prompt')) return;

    const prompt = document.createElement('div');
    prompt.id = 'passkey-auto-login-prompt';
    prompt.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #4285f4;
      color: white;
      padding: 16px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
      z-index: 10000;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 14px;
      max-width: 300px;
    `;

    prompt.innerHTML = `
      <div style="margin-bottom: 12px;">
        <strong>🔑 Passkey Available</strong>
      </div>
      <div style="margin-bottom: 12px;">
        Login with your saved passkey?
      </div>
      <div>
        <button id="use-passkey" style="background: white; color: #4285f4; border: none; padding: 6px 12px; border-radius: 4px; margin-right: 8px; cursor: pointer; font-size: 12px;">Use Passkey</button>
        <button id="dismiss-passkey" style="background: rgba(255,255,255,0.2); color: white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-size: 12px;">Dismiss</button>
      </div>
    `;

    prompt.querySelector('#use-passkey').addEventListener('click', () => {
      this.triggerPasskeyLogin(passkeys[0]); // Use first available passkey
      prompt.remove();
    });

    prompt.querySelector('#dismiss-passkey').addEventListener('click', () => {
      prompt.remove();
    });

    // Auto-dismiss after 10 seconds
    setTimeout(() => {
      if (prompt.parentNode) {
        prompt.remove();
      }
    }, 10000);

    document.body.appendChild(prompt);
  }

  triggerPasskeyLogin(passkey) {
    // Simulate WebAuthn get call with the selected passkey
    window.postMessage({
      type: 'TRIGGER_PASSKEY_LOGIN',
      passkey: passkey
    }, '*');
  }

  async handleSaveCreatedPasskey(passkeyData) {
    try {
      await chrome.runtime.sendMessage({
        type: 'SAVE_CREATED_PASSKEY',
        data: passkeyData
      });
    } catch (error) {
      console.error('Failed to save created passkey:', error);
    }
  }

  async handleUsePasskey(passkeyId) {
    try {
      // Get the passkey data
      const response = await chrome.runtime.sendMessage({
        type: 'GET_PASSKEYS'
      });

      if (response.success && response.data[passkeyId]) {
        const passkey = response.data[passkeyId];
        
        // Update usage timestamp
        await chrome.runtime.sendMessage({
          type: 'UPDATE_PASSKEY_USAGE',
          data: { id: passkeyId }
        });

        // Trigger passkey login
        this.triggerPasskeyLogin(passkey);
      }
    } catch (error) {
      console.error('Failed to use passkey:', error);
    }
  }

  injectPageScript() {
    // The injected script is loaded separately via web_accessible_resources
  }
}

// Initialize content script
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => new PassKeyContentScript());
} else {
  new PassKeyContentScript();
}