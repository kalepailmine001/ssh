// background.js - service worker for Passkey Manager extension

// Utility to wrap chrome.storage.local with Promise convenience
const storage = {
  async get(key) {
    return new Promise((resolve) => {
      chrome.storage.local.get(key, (result) => resolve(result[key]));
    });
  },
  async set(obj) {
    return new Promise((resolve) => {
      chrome.storage.local.set(obj, () => resolve());
    });
  },
  async remove(key) {
    return new Promise((resolve) => {
      chrome.storage.local.remove(key, () => resolve());
    });
  }
};

// Ensure storage structure exists
chrome.runtime.onInstalled.addListener(async () => {
  const existing = await storage.get("passkeys");
  if (!existing) {
    await storage.set({ passkeys: [] });
  }
});

// Message listener for CRUD operations and queries
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  (async () => {
    switch (message.action) {
      case "listPasskeys": {
        const passkeys = (await storage.get("passkeys")) || [];
        sendResponse({ ok: true, passkeys });
        break;
      }
      case "savePasskey": {
        const { credential } = message; // {id, rpId, userHandle, name, publicKey}
        if (!credential?.id) return sendResponse({ ok: false, error: "Invalid credential" });
        const passkeys = (await storage.get("passkeys")) || [];
        const idx = passkeys.findIndex((c) => c.id === credential.id);
        if (idx >= 0) {
          passkeys[idx] = credential;
        } else {
          passkeys.push(credential);
        }
        await storage.set({ passkeys });
        sendResponse({ ok: true });
        break;
      }
      case "deletePasskey": {
        const { credentialId } = message;
        let passkeys = (await storage.get("passkeys")) || [];
        passkeys = passkeys.filter((c) => c.id !== credentialId);
        await storage.set({ passkeys });
        sendResponse({ ok: true });
        break;
      }
      default:
        sendResponse({ ok: false, error: "Unknown action" });
    }
  })();
  // Explicitly return true to keep message channel open for async response
  return true;
});