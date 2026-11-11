// 숫자를 화면에 보여줄 글자로 바꾸는 함수들

// 속도(km/h) -> 페이스("분:초" per km). 예) 10 km/h -> "6:00"
export function formatPace(kmh) {
  if (kmh < 1) return '--:--'; // 너무 느리면 페이스 의미가 없음
  const secondsPerKm = Math.round(3600 / kmh);
  const min = Math.floor(secondsPerKm / 60);
  const sec = secondsPerKm % 60;
  return `${min}:${String(sec).padStart(2, '0')}`;
}

// 거리(m) -> "850 m" 또는 "1.23 km"
export function formatDistance(meters) {
  if (meters < 1000) return `${Math.floor(meters)} m`;
  return `${(meters / 1000).toFixed(2)} km`;
}

// 시간(초) -> "12:34" 또는 "1:02:03"
export function formatDuration(totalSeconds) {
  const s = Math.floor(totalSeconds);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const mmss = `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  return h > 0 ? `${h}:${mmss}` : mmss;
}
