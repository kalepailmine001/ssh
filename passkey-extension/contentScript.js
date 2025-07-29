// contentScript.js
// Handles WebAuthn interactions from the popup or background.

async function createPasskey() {
  const publicKey = {
    challenge: Uint8Array.from("passkey-challenge" + Date.now(), c => c.charCodeAt(0)),
    rp: { name: document.location.hostname },
    user: {
      id: Uint8Array.from(window.crypto.getRandomValues(new Uint8Array(16))),
      name: `user-${Date.now()}`,
      displayName: `User ${Date.now()}`
    },
    pubKeyCredParams: [{ type: "public-key", alg: -7 }], // ES256
    authenticatorSelection: { residentKey: "required", userVerification: "preferred" },
    timeout: 60000,
  };

  try {
    const credential = await navigator.credentials.create({ publicKey });
    if (!credential) throw new Error("Creation returned null");
    const credId = arrayBufferToBase64Url(credential.rawId);
    const publicKeyCred = credential.response?.getPublicKey?.() || null;

    // Send credential info to background for storage
    chrome.runtime.sendMessage({
      action: "savePasskey",
      credential: {
        id: credId,
        rpId: document.location.hostname,
        userHandle: arrayBufferToBase64Url(publicKey.user.id),
        name: publicKey.user.name,
        publicKey: publicKeyCred ? arrayBufferToBase64Url(publicKeyCred) : null,
      }
    });

    return { ok: true, id: credId };
  } catch (err) {
    console.error("Passkey creation failed", err);
    return { ok: false, error: err.message };
  }
}

async function getPasskey(allowedIds = []) {
  const publicKey = {
    challenge: Uint8Array.from("login-challenge" + Date.now(), c => c.charCodeAt(0)),
    allowCredentials: allowedIds.map(id => ({ id: base64UrlToArrayBuffer(id), type: "public-key" })),
    timeout: 60000,
    userVerification: "preferred",
  };
  try {
    const assertion = await navigator.credentials.get({ publicKey });
    if (!assertion) throw new Error("Assertion null");
    const credId = arrayBufferToBase64Url(assertion.rawId);
    return { ok: true, credentialId: credId, response: assertion.response };
  } catch (err) {
    console.error("Passkey get failed", err);
    return { ok: false, error: err.message };
  }
}

// Message listener
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  (async () => {
    switch (message.action) {
      case "initiateCreatePasskey": {
        const result = await createPasskey();
        sendResponse(result);
        break;
      }
      case "initiateGetPasskey": {
        const result = await getPasskey(message.allowedIds || []);
        sendResponse(result);
        break;
      }
      default:
        // ignore
    }
  })();
  return true;
});

// Utility conversions
function arrayBufferToBase64Url(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  bytes.forEach(b => binary += String.fromCharCode(b));
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function base64UrlToArrayBuffer(base64url) {
  const base64 = base64url.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}