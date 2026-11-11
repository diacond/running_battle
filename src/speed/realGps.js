// 실제 폰 GPS에서 위치를 받아오는 코드

const ERROR_MESSAGES = {
  1: '위치 권한이 거부됐어요. 브라우저 설정에서 위치 권한을 허용해 주세요.',
  2: '위치를 찾을 수 없어요. 실외로 나가거나 잠시 기다려 주세요.',
  3: '위치 응답이 늦어요. 계속 시도하는 중…',
};

// 시작하면 "멈추는 함수"를 돌려줌
export function startRealGps(onPosition, onError) {
  if (!window.isSecureContext) {
    onError('GPS는 https 주소(또는 localhost)에서만 쓸 수 있어요.');
    return () => {};
  }
  if (!('geolocation' in navigator)) {
    onError('이 브라우저는 GPS를 지원하지 않아요.');
    return () => {};
  }

  let lastTimestamp = 0;
  const handlePosition = (p) => {
    // 같은 위치가 두 번 오거나(감시 + 직접 요청), 순서가 뒤바뀐 건 무시
    if (p.timestamp <= lastTimestamp) return;
    lastTimestamp = p.timestamp;
    onPosition({
      lat: p.coords.latitude,
      lon: p.coords.longitude,
      accuracy: p.coords.accuracy,
      speed: p.coords.speed, // 폰이 계산한 속도(m/s). 없으면 null
      time: p.timestamp,
    });
  };
  const highAccuracy = { enableHighAccuracy: true, maximumAge: 0 };

  // 방법 1) 위치가 바뀔 때마다 알려달라고 요청 (감시)
  const watchId = navigator.geolocation.watchPosition(
    handlePosition,
    (err) => onError(ERROR_MESSAGES[err.code] ?? err.message),
    { ...highAccuracy, timeout: 15000 }
  );

  // 방법 2) 폰이 위치를 잘 안 보내줄 때를 대비해 2초마다 직접 물어봄
  let asking = false;
  const pollId = setInterval(() => {
    if (asking) return; // 이전 요청이 아직 안 끝났으면 건너뜀
    asking = true;
    navigator.geolocation.getCurrentPosition(
      (p) => {
        asking = false;
        handlePosition(p);
      },
      () => {
        asking = false; // 실패는 감시 쪽 에러 메시지로 충분
      },
      { ...highAccuracy, timeout: 5000 }
    );
  }, 2000);

  // 달리는 동안 화면이 꺼지지 않게 (화면이 꺼지면 웹앱은 GPS를 못 받음)
  let wakeLock = null;
  const lockScreen = async () => {
    try {
      wakeLock = await navigator.wakeLock?.request('screen');
    } catch {
      // 지원하지 않는 브라우저면 그냥 넘어감
    }
  };
  // 다른 앱 갔다가 돌아오면 다시 화면 켜두기 요청
  const onVisibility = () => {
    if (document.visibilityState === 'visible') lockScreen();
  };
  lockScreen();
  document.addEventListener('visibilitychange', onVisibility);

  return () => {
    navigator.geolocation.clearWatch(watchId);
    clearInterval(pollId);
    document.removeEventListener('visibilitychange', onVisibility);
    wakeLock?.release().catch(() => {});
  };
}
