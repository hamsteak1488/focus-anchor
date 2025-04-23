/**
 * src/debug.ts
 * → jsdom + canvas + content.ts 의 load 이벤트 핸들러를 강제 실행
 */

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
        callback({ focusActive: true });
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
  },
};

(async () => {
  try {
    // 3) content.ts 를 불러오면, 그 안에서 load 이벤트 핸들러가 등록됨
    await import("./content");
    console.log("[debug] content.ts imported");

    // 4) 여기서 load 이벤트를 강제로 날려 줌
    window.dispatchEvent(new window.Event("load"));
    console.log("[debug] window.load dispatched");
  } catch (err) {
    console.error(err);
  } finally {
    // 5) N초 뒤에 cleanup(), 그 사이에 content.ts 로직(1초 지연 포함)이 다 돌아감
    setTimeout(() => {
      cleanup();
      console.log("[debug] jsdom cleaned up");
    }, 10000);
  }
})();
