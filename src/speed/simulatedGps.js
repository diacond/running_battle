// PC 테스트용 가짜 GPS
// 실제 GPS처럼 1초마다 위치(위도/경도)를 만들어서 넘겨줌.
// 진짜 GPS처럼 오차(흔들림)와 가끔 튀는 엉터리 위치도 섞을 수 있음.

// 시나리오: [몇 초 동안, 몇 km/h로, 이름]
export const SCENARIOS = {
  realRun: {
    name: '실전 러닝 (걷기→조깅→신호등→러닝→쿨다운)',
    steps: [
      [15, 5, '걷기'],
      [30, 9, '조깅'],
      [12, 0, '신호등 대기'],
      [30, 11, '러닝'],
      [15, 6, '쿨다운'],
    ],
  },
  steady: {
    name: '7분 페이스 유지',
    steps: [[60, 60 / 7, '7분 페이스']],
  },
  interval: {
    name: '인터벌 (질주 20초 / 조깅 20초)',
    steps: [
      [20, 14, '질주'],
      [20, 7, '회복 조깅'],
    ],
  },
};

const START = { lat: 37.5665, lon: 126.978 }; // 출발 지점 (아무 위치나 상관없음)
const NOISE_M = 3; // 평소 GPS 흔들림 크기(m)
const GLITCH_CHANCE = 0.05; // 5% 확률로 크게 튀는 위치

// onPosition: 가짜 위치를 받을 함수, onTruth: "정답 속도"를 받을 함수(비교용)
export function startSimulation(scenarioKey, { noise }, onPosition, onTruth) {
  const { steps } = SCENARIOS[scenarioKey];
  const totalSec = steps.reduce((sum, [sec]) => sum + sec, 0);
  const metersPerLon = 111320 * Math.cos((START.lat * Math.PI) / 180);
  const metersPerLat = 110540;

  let elapsed = 0;
  let trueDistance = 0; // 실제로 이동한 거리(m), 동쪽으로 달린다고 가정

  const tick = () => {
    // 지금 시나리오의 어느 구간인지 찾기 (끝나면 처음부터 반복)
    let t = elapsed % totalSec;
    let step = steps[0];
    for (const s of steps) {
      if (t < s[0]) {
        step = s;
        break;
      }
      t -= s[0];
    }
    const [, kmh, label] = step;
    onTruth({ kmh, label });

    trueDistance += kmh / 3.6; // 1초 동안 이동한 거리
    elapsed++;

    let x = trueDistance;
    let y = 0;
    let accuracy = 5;
    if (noise) {
      x += randomNormal() * NOISE_M;
      y += randomNormal() * NOISE_M;
      accuracy = 4 + Math.random() * 6;
      if (Math.random() < GLITCH_CHANCE) {
        // 건물 사이 등에서 생기는 엉터리 위치
        x += (Math.random() - 0.5) * 80;
        accuracy = 40 + Math.random() * 30;
      }
    }

    onPosition({
      lat: START.lat + y / metersPerLat,
      lon: START.lon + x / metersPerLon,
      accuracy,
      speed: null, // 폰 속도값 없이, 위치 변화만으로 계산하는 어려운 경우를 테스트
      time: Date.now(),
    });
  };

  tick();
  const id = setInterval(tick, 1000);
  return () => clearInterval(id);
}

// 정규분포 난수 (실제 GPS 오차와 비슷한 모양)
function randomNormal() {
  const u = 1 - Math.random();
  const v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}
