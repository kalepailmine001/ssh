// Injected script to intercept WebAuthn API calls
(function() {
  'use strict';

  // Prevent multiple injections
  if (window.passkeyManagerWebAuthnIntercepted) {
    return;
  }
  window.passkeyManagerWebAuthnIntercepted = true;

  // Store original WebAuthn methods
  const originalCreate = navigator.credentials.create;
  const originalGet = navigator.credentials.get;

  // Request counter for tracking async operations
  let requestCounter = 0;
  const pendingRequests = new Map();

  // Override navigator.credentials.create
  navigator.credentials.create = function(options) {
    if (options && options.publicKey) {
      const requestId = ++requestCounter;
      
      return new Promise((resolve, reject) => {
        pendingRequests.set(requestId, { resolve, reject, type: 'create' });
        
        // Send request to content script
        window.postMessage({
          type: 'WEBAUTHN_CREATE_REQUEST',
          options: options.publicKey,
          requestId: requestId
        }, '*');
        
        // Set timeout for the request
        setTimeout(() => {
          if (pendingRequests.has(requestId)) {
            pendingRequests.delete(requestId);
            // Fall back to original method
            originalCreate.call(navigator.credentials, options)
              .then(resolve)
              .catch(reject);
          }
        }, 5000);
      });
    }
    
    return originalCreate.call(navigator.credentials, options);
  };

  // Override navigator.credentials.get
  navigator.credentials.get = function(options) {
    if (options && options.publicKey) {
      const requestId = ++requestCounter;
      
      return new Promise((resolve, reject) => {
        pendingRequests.set(requestId, { resolve, reject, type: 'get' });
        
        // Send request to content script
        window.postMessage({
          type: 'WEBAUTHN_GET_REQUEST',
          options: options.publicKey,
          requestId: requestId
        }, '*');
        
        // Set timeout for the request
        setTimeout(() => {
          if (pendingRequests.has(requestId)) {
            pendingRequests.delete(requestId);
            // Fall back to original method
            originalGet.call(navigator.credentials, options)
              .then(resolve)
              .catch(reject);
          }
        }, 5000);
      });
    }
    
    return originalGet.call(navigator.credentials, options);
  };

  // Listen for responses from content script
  window.addEventListener('message', function(event) {
    if (event.source !== window) return;
    
    if (event.data.type === 'WEBAUTHN_CREATE_RESPONSE') {
      const request = pendingRequests.get(event.data.requestId);
      if (request && request.type === 'create') {
        pendingRequests.delete(event.data.requestId);
        
        if (event.data.success) {
          // Proceed with original WebAuthn create call
          const options = { publicKey: event.data.options || {} };
          originalCreate.call(navigator.credentials, options)
            .then(credential => {
              // Save the created credential
              if (credential && credential.rawId) {
                const credentialData = {
                  ...event.data.data,
                  credentialId: Array.from(new Uint8Array(credential.rawId)),
                  publicKey: credential.response.publicKey ? Array.from(new Uint8Array(credential.response.publicKey)) : null,
                  attestationObject: credential.response.attestationObject ? Array.from(new Uint8Array(credential.response.attestationObject)) : null
                };
                
                // Send credential data to background script for storage
                window.postMessage({
                  type: 'SAVE_CREATED_PASSKEY',
                  data: credentialData
                }, '*');
              }
              
              request.resolve(credential);
            })
            .catch(request.reject);
        } else {
          request.reject(new Error(event.data.error || 'WebAuthn create failed'));
        }
      }
    } else if (event.data.type === 'WEBAUTHN_GET_RESPONSE') {
      const request = pendingRequests.get(event.data.requestId);
      if (request && request.type === 'get') {
        pendingRequests.delete(event.data.requestId);
        
        if (event.data.success) {
          if (event.data.useOriginal) {
            // Use original WebAuthn method
            const options = { publicKey: event.data.options || {} };
            originalGet.call(navigator.credentials, options)
              .then(request.resolve)
              .catch(request.reject);
          } else if (event.data.passkey) {
            // Use stored passkey to create credential response
            const passkey = event.data.passkey;
            
            try {
              // Create a mock credential response
              const credential = {
                id: arrayBufferToBase64(new Uint8Array(passkey.credentialId)),
                rawId: new Uint8Array(passkey.credentialId).buffer,
                type: 'public-key',
                response: {
                  clientDataJSON: new TextEncoder().encode(JSON.stringify({
                    type: 'webauthn.get',
                    challenge: 'mock-challenge',
                    origin: window.location.origin
                  })),
                  authenticatorData: new Uint8Array(37), // Mock authenticator data
                  signature: new Uint8Array(64), // Mock signature
                  userHandle: passkey.userId ? new TextEncoder().encode(passkey.userId) : null
                }
              };
              
              request.resolve(credential);
            } catch (error) {
              // Fall back to original method if mock fails
              const options = { publicKey: event.data.options || {} };
              originalGet.call(navigator.credentials, options)
                .then(request.resolve)
                .catch(request.reject);
            }
          }
        } else {
          request.reject(new Error(event.data.error || 'WebAuthn get failed'));
        }
      }
    } else if (event.data.type === 'TRIGGER_PASSKEY_LOGIN') {
      // Trigger automatic passkey login
      const passkey = event.data.passkey;
      
      // Look for WebAuthn get calls or login forms
      const loginButtons = document.querySelectorAll('button[type="submit"], input[type="submit"], .login-btn, .signin-btn, #login, #signin');
      
      if (loginButtons.length > 0) {
        // Try to trigger the first login button
        loginButtons[0].click();
      } else {
        // Try to trigger WebAuthn get directly
        const mockOptions = {
          publicKey: {
            challenge: new Uint8Array(32),
            allowCredentials: [{
              type: 'public-key',
              id: new Uint8Array(passkey.credentialId)
            }],
            userVerification: 'preferred'
          }
        };
        
        navigator.credentials.get(mockOptions).catch(() => {
          // Ignore errors, this is just to trigger the flow
        });
      }
    } else if (event.data.type === 'SAVE_CREATED_PASSKEY') {
      // Forward to content script to save in background
      // This is handled by the content script's message listener
    }
  });

  // Utility function to convert ArrayBuffer to base64
  function arrayBufferToBase64(buffer) {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
  }

  // Log that injection was successful
  console.log('PassKey Manager: WebAuthn interception active');
})();