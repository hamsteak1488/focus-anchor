const focusToggleButton = document.getElementById("focus-toggle")!;
const reloadButton = document.getElementById("reload");

function checkRuntimeError(): boolean {
  if (chrome.runtime.lastError) {
    console.debug("No content script found or message failed:", chrome.runtime.lastError.message);
    return true;
  }
  return false;
}

document.addEventListener("DOMContentLoaded", async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  chrome.tabs.sendMessage(tab.id!, { type: "get-focus-state" }, (resp) => {
    if (checkRuntimeError()) return;
    if (!resp) return;
    updateIndicator(resp.isActive);
  });
});

focusToggleButton.addEventListener("click", async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  chrome.tabs.sendMessage(tab.id!, { type: "toggle-focus" }, (resp) => {
    if (checkRuntimeError()) return;
    if (!resp) return;
    updateIndicator(resp.isActive);
  });
});

reloadButton?.addEventListener("click", async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  chrome.tabs.sendMessage(tab.id!, { type: "reload" }, (resp) => {
    if (checkRuntimeError()) return;
  });
});

function updateIndicator(active: boolean) {
  focusToggleButton.style.backgroundColor = active ? "chartreuse" : "darkorange";
}

document.addEventListener("DOMContentLoaded", async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  chrome.tabs.sendMessage(tab.id!, { type: "get-figure" }, (resp) => {
    if (checkRuntimeError()) return;
    if (resp?.figure) {
      const radio = document.querySelector<HTMLInputElement>(
        `input[name="figure"][value="${resp.figure}"]`
      );
      if (radio) radio.checked = true;
    }
  });
  chrome.tabs.sendMessage(tab.id!, { type: "get-paint" }, (resp) => {
    if (checkRuntimeError()) return;
    if (resp?.paint) {
      const radio = document.querySelector<HTMLInputElement>(
        `input[name="paint"][value="${resp.paint}"]`
      );
      if (radio) radio.checked = true;
    }
  });

  const figureRadios = document.querySelectorAll<HTMLInputElement>('input[name="figure"]');
  figureRadios.forEach((radio) => {
    radio.addEventListener("change", async () => {
      const figure = radio.value;
      chrome.tabs.sendMessage(tab.id!, { type: "set-figure", figure }, (resp) => {
        if (checkRuntimeError()) return;
      });
    });
  });
  const paintRadios = document.querySelectorAll<HTMLInputElement>('input[name="paint"]');
  paintRadios.forEach((radio) => {
    radio.addEventListener("change", async () => {
      const paint = radio.value;
      chrome.tabs.sendMessage(tab.id!, { type: "set-paint", paint }, (resp) => {
        if (checkRuntimeError()) return;
      });
    });
  });
});
