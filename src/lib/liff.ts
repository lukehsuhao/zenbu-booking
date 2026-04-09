import liff from "@line/liff";

let initialized = false;

export async function initLiff(): Promise<typeof liff> {
  if (!initialized) {
    await Promise.race([
      liff.init({ liffId: process.env.NEXT_PUBLIC_LIFF_ID! }),
      new Promise((_, reject) => setTimeout(() => reject(new Error("LIFF init timeout")), 8000)),
    ]);
    initialized = true;
  }
  // 在 LINE App 內開啟時，LIFF SDK 會自動處理授權，不需要呼叫 login()
  // 只有在外部瀏覽器開啟且未登入時才需要手動 login
  if (!liff.isInClient() && !liff.isLoggedIn()) {
    liff.login({ redirectUri: window.location.href });
  }
  return liff;
}

export { liff };
