// GPS 위치 기록들을 받아서 "지금 속도"를 계산하는 클래스
//
// 위치 하나(pos)의 모양:
//   { lat: 위도, lon: 경도, accuracy: 오차(m), speed: 폰이 알려준 속도(m/s) 또는 null, time: 시각(ms) }
//
// 실제 GPS(realGps.js)와 시뮬레이션(simulatedGps.js)이 같은 모양으로 위치를 넘겨주기 때문에
// PC에서 시뮬레이션으로 테스트한 계산이 폰에서도 똑같이 동작함.

const WINDOW_MS = 10000; // 최근 10초 동안의 기록으로 속도를 계산 (짧으면 흔들리고, 길면 반응이 느림)
const MIN_SPAN_MS = 3000; // 기록이 3초치는 쌓여야 계산 시작
const MAX_ACCURACY_M = 30; // 오차가 30m보다 큰 위치는 믿지 않고 버림
const STOP_KMH = 2.5; // 이보다 느리면 "멈춤"으로 봄 (가만히 있어도 GPS가 조금씩 흔들리기 때문)
const MAX_KMH = 40; // 이보다 빠르면 잘못된 값으로 보고 잘라냄
// 폰은 위치가 거의 안 바뀌면(서 있을 때, 실내) 새 위치를 잘 안 보내줌.
// 그래서 위치가 잠깐 안 오는 건 "신호 없음"이 아니라 "안 움직이는 중"으로 봄.
const STILL_MS = 5000; // 5초 넘게 새 위치가 없으면 "멈춰 있음"(속도 0)
const LOST_MS = 15000; // 15초 넘게 새 위치가 없으면 그때 "신호 끊김"

export class GpsSpeedTracker {
  constructor() {
    this.reset();
  }

  reset() {
    this.samples = []; // 최근 위치 기록들
    this.speedKmh = 0;
    this.status = 'waiting'; // waiting(대기) | good(양호) | weak(약함) | still(멈춰 있음) | lost(끊김)
    this.lastAccuracy = null;
    this.lastReceivedAt = null;
    this.count = 0; // 받은 위치 개수
  }

  addPosition(pos) {
    this.count++;
    this.lastAccuracy = pos.accuracy;
    this.lastReceivedAt = Date.now();

    // 오차가 너무 큰 위치는 버리고, 이전 속도를 그대로 유지
    if (pos.accuracy > MAX_ACCURACY_M) {
      this.status = 'weak';
      return;
    }

    this.samples.push(pos);
    // 오래된 기록은 버림
    while (pos.time - this.samples[0].time > WINDOW_MS) this.samples.shift();

    const first = this.samples[0];
    if (pos.time - first.time < MIN_SPAN_MS) {
      this.status = 'waiting';
      this.speedKmh = 0;
      return;
    }

    let kmh = calcSpeedMps(this.samples) * 3.6;
    if (kmh < STOP_KMH) kmh = 0;
    if (kmh > MAX_KMH) kmh = MAX_KMH;
    this.speedKmh = kmh;
    this.status = 'good';
  }

  // 마지막 위치를 받은 지 몇 초 지났는지
  secondsSinceLast() {
    return this.lastReceivedAt ? (Date.now() - this.lastReceivedAt) / 1000 : null;
  }

  // 1초마다 불러서 위치가 한동안 안 왔는지 확인
  checkLost() {
    const since = this.secondsSinceLast();
    if (since == null) return;
    if (since * 1000 > LOST_MS) {
      this.status = 'lost';
      this.speedKmh = 0;
    } else if (since * 1000 > STILL_MS && this.count > 0) {
      this.status = 'still';
      this.speedKmh = 0;
    }
  }
}

// 속도 계산 (m/s)
function calcSpeedMps(samples) {
  // 방법 1) 폰이 직접 알려주는 속도가 있으면 그 평균을 씀 (대부분의 스마트폰은 이게 꽤 정확함)
  const withSpeed = samples.filter((s) => s.speed != null && s.speed >= 0);
  if (withSpeed.length >= samples.length / 2) {
    return withSpeed.reduce((sum, s) => sum + s.speed, 0) / withSpeed.length;
  }

  // 방법 2) 위치 변화로 직접 계산
  // 점 두 개만 보면 GPS 오차 때문에 크게 흔들리므로,
  // 최근 점들 전체를 가장 잘 지나는 "직선"을 구해서 그 기울기를 속도로 씀 (최소제곱법)
  const lat0 = samples[0].lat;
  const lon0 = samples[0].lon;
  const t0 = samples[0].time;
  const metersPerLon = 111320 * Math.cos((lat0 * Math.PI) / 180);
  const metersPerLat = 110540;

  const points = samples.map((s) => ({
    t: (s.time - t0) / 1000,
    x: (s.lon - lon0) * metersPerLon,
    y: (s.lat - lat0) * metersPerLat,
  }));

  const meanT = points.reduce((sum, p) => sum + p.t, 0) / points.length;
  let stt = 0;
  let stx = 0;
  let sty = 0;
  for (const p of points) {
    const dt = p.t - meanT;
    stt += dt * dt;
    stx += dt * p.x;
    sty += dt * p.y;
  }
  if (stt === 0) return 0;
  return Math.hypot(stx / stt, sty / stt); // 가로 속도와 세로 속도를 합침
}
