import liff from "@line/liff";

let initialized = false;

export async function initLiff(): Promise<typeof liff> {
  if (!initialized) {
    await liff.init({ liffId: process.env.NEXT_PUBLIC_LIFF_ID! });
    initialized = true;
  }
  // 在 LINE App 內開啟 LIFF 時已經登入，不需要再呼叫 login()
  // 只有在外部瀏覽器開啟且未登入時才 redirect
  if (!liff.isInClient() && !liff.isLoggedIn()) {
    liff.login();
  }
  return liff;
}

export { liff };
