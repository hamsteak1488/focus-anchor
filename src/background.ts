chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === "request-toggle-focus") {
    if (sender.tab && sender.tab.id) {
      chrome.tabs.sendMessage(sender.tab.id, { type: "toggle-focus" });
    }
  }
});

chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === "update") {
    chrome.storage.local.set({ releaseNoteChecked: false });
  }
});
