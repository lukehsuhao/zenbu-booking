import liff from "@line/liff";

let initialized = false;

export async function initLiff(): Promise<typeof liff> {
  if (!initialized) {
    await liff.init({ liffId: process.env.NEXT_PUBLIC_LIFF_ID! });
    initialized = true;
  }
  if (!liff.isLoggedIn()) {
    liff.login();
  }
  return liff;
}

export { liff };
