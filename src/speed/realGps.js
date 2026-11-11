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

  const watchId = navigator.geolocation.watchPosition(
    (p) =>
      onPosition({
        lat: p.coords.latitude,
        lon: p.coords.longitude,
        accuracy: p.coords.accuracy,
        speed: p.coords.speed, // 폰이 계산한 속도(m/s). 없으면 null
        time: p.timestamp,
      }),
    (err) => onError(ERROR_MESSAGES[err.code] ?? err.message),
    { enableHighAccuracy: true, maximumAge: 0, timeout: 15000 }
  );

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
    document.removeEventListener('visibilitychange', onVisibility);
    wakeLock?.release().catch(() => {});
  };
}
