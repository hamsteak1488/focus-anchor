document.getElementById("focus-toggle")?.addEventListener("click", async () => {
  // 현재 탭에 content‑script 형태로 코드 삽입
  const [{ id }] = await chrome.tabs.query({
    active: true,
    currentWindow: true,
  });
  if (!id) return;

  await chrome.scripting.executeScript({
    target: { tabId: id },
    func: () => {
      document.documentElement.classList.toggle("focus‑anchor__active");
    },
  });
});
