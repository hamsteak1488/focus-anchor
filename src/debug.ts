import { readFileSync } from "fs";
import createGlobalJsdom from "global-jsdom";
import { Canvas, Image, ImageData } from "canvas";

// 0) Canvas API를 globalThis에 등록
Object.assign(globalThis, { Canvas, Image, ImageData });

// 1) sample.html 읽어서 jsdom 전역 설치
const html = readFileSync("sample.html", "utf8");
const cleanup = createGlobalJsdom(html, {
  url: "https://example.com",
  pretendToBeVisual: true,
});

// 2) 최소한의 chrome 확장 API 스텁
(globalThis as any).chrome = {
  runtime: {
    sendMessage: () => {},
    onMessage: { addListener: () => {} },
  },
  storage: {
    local: {
      get: (_keys: string | string[] | { [key: string]: any }, callback: (items: any) => void) => {
        const result = { focusActive: true };
        if (typeof callback === "function") {
          callback(result);
        } else {
          return Promise.resolve(result);
        }
      },
      set: (_items: any, callback?: () => void) => {
        callback?.();
      },
      remove: (_keys: string | string[], callback?: () => void) => {
        callback?.();
      },
      clear: (callback?: () => void) => {
        callback?.();
      },
    },
    onChanged: {
      addListener: (_listner: Function) => {},
    },
  },
};

(async () => {
  try {
    // 3) content.ts 를 불러오면, 그 안에서 load 이벤트 핸들러 등록
    await import("./content");
    console.log("[debug] content.ts imported");

    // 4) 여기서 load 이벤트를 강제로 날리기
    window.document.dispatchEvent(new window.Event("DOMContentLoaded"));
    console.log("[debug] window.load dispatched");
  } catch (err) {
    console.error(err);
  } finally {
    // 5) N초 뒤에 cleanup()
    setTimeout(() => {
      cleanup();
      console.log("[debug] jsdom cleaned up");
    }, 10_000);
  }
})();
