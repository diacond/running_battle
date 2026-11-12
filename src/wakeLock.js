// "화면 켜두기" (선택 기능)
// 켜 두면 달리는 동안 화면이 자동으로 꺼지지 않음 → 웹에서도 GPS가 끊기지 않음

let wanted = false;
let lock = null;

async function acquire() {
  if (!wanted || lock || document.visibilityState !== 'visible') return;
  try {
    lock = await navigator.wakeLock?.request('screen');
    lock?.addEventListener('release', () => (lock = null));
  } catch {
    // 지원하지 않는 브라우저면 그냥 넘어감
  }
}

// 다른 앱에 갔다 오면 잠금이 풀리므로 다시 요청
document.addEventListener('visibilitychange', acquire);

export function setKeepAwake(on) {
  wanted = on;
  if (on) acquire();
  else {
    lock?.release().catch(() => {});
    lock = null;
  }
}
