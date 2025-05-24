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

document.addEventListener("DOMContentLoaded", async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  chrome.tabs.sendMessage(tab.id!, { type: "get-figure" }, (resp) => {
    if (resp?.figure) {
      const radio = document.querySelector<HTMLInputElement>(
        `input[name="figure"][value="${resp.figure}"]`
      );
      if (radio) radio.checked = true;
    }
  });
  chrome.tabs.sendMessage(tab.id!, { type: "get-paint" }, (resp) => {
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
      chrome.tabs.sendMessage(tab.id!, { type: "set-figure", figure });
    });
  });
  const paintRadios = document.querySelectorAll<HTMLInputElement>('input[name="paint"]');
  paintRadios.forEach((radio) => {
    radio.addEventListener("change", async () => {
      const paint = radio.value;
      chrome.tabs.sendMessage(tab.id!, { type: "set-paint", paint });
    });
  });
});
