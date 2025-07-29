// popup.js
const listEl = document.getElementById("list");
const addBtn = document.getElementById("addBtn");
let currentTab;
let currentOrigin;

// Get active tab
chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
  currentTab = tabs[0];
  try {
    const url = new URL(currentTab.url);
    currentOrigin = url.hostname;
  } catch (e) {
    currentOrigin = null;
  }
  refreshList();
});

function refreshList() {
  chrome.runtime.sendMessage({ action: "listPasskeys" }, ({ ok, passkeys }) => {
    if (!ok) return;
    listEl.innerHTML = "";
    passkeys.filter(p => !currentOrigin || p.rpId === currentOrigin).forEach((cred) => {
      const li = document.createElement("li");
      const span = document.createElement("span");
      span.textContent = cred.name || cred.id.substring(0,8) + "...";
      span.className = "small";
      li.appendChild(span);

      const loginBtn = document.createElement("button");
      loginBtn.textContent = "Login";
      loginBtn.onclick = () => initiateLogin(cred.id);
      li.appendChild(loginBtn);

      const delBtn = document.createElement("button");
      delBtn.textContent = "✕";
      delBtn.onclick = () => deletePasskey(cred.id);
      li.appendChild(delBtn);

      listEl.appendChild(li);
    });
  });
}

function deletePasskey(id) {
  chrome.runtime.sendMessage({ action: "deletePasskey", credentialId: id }, () => refreshList());
}

function initiateLogin(id) {
  if (!currentTab) return;
  chrome.tabs.sendMessage(currentTab.id, { action: "initiateGetPasskey", allowedIds: [id] }, (response) => {
    if (!response?.ok) {
      alert("Login failed: " + (response?.error || "Unknown"));
    } else {
      alert("Passkey assertion obtained. Website should now continue login.");
    }
  });
}

addBtn.addEventListener("click", () => {
  if (!currentTab) return;
  chrome.tabs.sendMessage(currentTab.id, { action: "initiateCreatePasskey" }, (response) => {
    if (!response?.ok) {
      alert("Creation failed: " + (response?.error || "Unknown"));
    } else {
      refreshList();
    }
  });
});