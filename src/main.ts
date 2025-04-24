const btn = document.getElementById("focus-toggle")!;

document.addEventListener("DOMContentLoaded", async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  chrome.tabs.sendMessage(tab.id!, { type: "get-focus-state" }, (resp) => {
    updateIndicator(resp.isActive);
  });
});

btn.addEventListener("click", async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  chrome.tabs.sendMessage(tab.id!, { type: "toggle-focus" }, (resp) => {
    updateIndicator(resp.isActive);
  });
});

function updateIndicator(active: boolean) {
  btn.style.backgroundColor = active ? "chartreuse" : "darkorange";
}
