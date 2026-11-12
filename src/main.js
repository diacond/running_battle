import Phaser from 'phaser';
import { RunScene, WIDTH, HEIGHT } from './RunScene.js';
import { GpsSpeedTracker, MAX_ACCURACY_M, distanceBetween } from './speed/GpsSpeedTracker.js';
import { startRealGps } from './speed/realGps.js';
import { startSimulation, SCENARIOS } from './speed/simulatedGps.js';
import { formatPace } from './format.js';
import { RunSession } from './run/RunSession.js';
import { loadRecords, saveRecord, deleteRecord, saveActiveRun, loadActiveRun, clearActiveRun } from './run/records.js';
import { showResult, renderRecordList } from './run/resultView.js';
import { setKeepAwake } from './wakeLock.js';

// 1) Phaser 게임 만들기
const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game', // index.html의 <div id="game"> 안에 그림
  width: WIDTH,
  height: HEIGHT,
  backgroundColor: '#7ec8f2',
  scale: {
    mode: Phaser.Scale.FIT, // 화면 크기에 맞게 자동으로 늘리고 줄임
    autoCenter: Phaser.Scale.CENTER_HORIZONTALLY,
  },
  scene: [RunScene],
});

// 2) 화면 요소 가져오기
const $ = (id) => document.getElementById(id);
const slider = $('speed-slider');
const statusBox = $('status');
const gpsButton = $('gps-button');
const simButton = $('sim-button');
const simScenario = $('sim-scenario');

// 배경 시간대 (테스트용). 주소 끝에 ?theme=night 처럼 붙여도 됨
const themeSelect = $('theme-select');
themeSelect.value = new URLSearchParams(location.search).get('theme') ?? 'auto';
game.registry.set('themeOverride', themeSelect.value);
themeSelect.addEventListener('change', () => game.registry.set('themeOverride', themeSelect.value));

// 속도를 화면 숫자와 게임에 반영 (어떤 입력 방식이든 결국 여기로 모임)
let currentKmh = 0;
function showSpeed(kmh) {
  currentKmh = kmh;
  $('speed-text').textContent = kmh.toFixed(1);
  $('pace-text').textContent = formatPace(kmh);
  // registry = 게임 안팎에서 같이 쓰는 공용 저장소. RunScene이 이 값을 읽어감
  game.registry.set('targetSpeedKmh', kmh);
}

function setStatus(text, level = '') {
  statusBox.textContent = text;
  statusBox.dataset.level = level;
}

// 3) GPS 계산 결과를 화면에 보여주기 (실제 GPS와 시뮬레이션이 같이 씀)
const tracker = new GpsSpeedTracker();
let stopSource = null; // 지금 돌고 있는 GPS/시뮬레이션을 멈추는 함수
let errorText = '';

function renderTracker() {
  showSpeed(tracker.speedKmh);
  if (errorText) return setStatus(errorText, 'error');

  const acc = tracker.lastAccuracy != null ? `±${Math.round(tracker.lastAccuracy)}m` : '-';
  const since = tracker.secondsSinceLast();
  // 원인 찾기용 정보: 받은 횟수, 마지막으로 받은 지 몇 초
  const info = since == null ? '아직 수신 없음' : `${tracker.count}회 수신 · 마지막 ${Math.floor(since)}초 전`;
  const messages = {
    waiting: `신호 받는 중… 몇 초만 기다려 주세요 (${info})`,
    good: `신호 양호 · 오차 ${acc} (${info})`,
    weak: `신호 약함 · 오차 ${acc} → 이 위치는 버림 (${info})`,
    still: `위치 변화 없음 → 멈춰 있는 것으로 봐요 (${info})`,
    lost: `신호 끊김 · 실외로 나가 보세요 (${info})`,
  };
  setStatus(messages[tracker.status], tracker.status === 'still' ? 'waiting' : tracker.status);
}

function startSource(start) {
  tracker.reset();
  errorText = '';
  stopSource = start(
    (pos) => {
      errorText = '';
      tracker.addPosition(pos);
      onPositionForRun(pos);
      renderTracker();
    },
    (message) => {
      errorText = message;
      renderTracker();
    }
  );
  renderTracker();
}

function stopCurrentSource() {
  stopSource?.();
  stopSource = null;
  gpsButton.textContent = 'GPS 시작';
  gpsButton.classList.remove('running');
  simButton.textContent = '시뮬레이션 시작';
  simButton.classList.remove('running');
  $('truth-card').hidden = true;
}

// 1초마다 신호 끊김 확인
setInterval(() => {
  if (!stopSource) return;
  tracker.checkLost();
  renderTracker();
}, 1000);

// 4) 입력 방식(탭) 바꾸기
let currentMode = 'manual';
function setMode(mode) {
  currentMode = mode;
  stopCurrentSource();
  document.querySelectorAll('.tabs button').forEach((b) => {
    b.setAttribute('aria-selected', String(b.dataset.mode === mode));
  });
  document.querySelectorAll('[data-mode-panel]').forEach((panel) => {
    panel.hidden = panel.dataset.modePanel !== mode;
  });

  if (mode === 'manual') {
    showSpeed(Number(slider.value));
    setStatus('');
  } else {
    showSpeed(0);
    setStatus(mode === 'gps' ? 'GPS 시작 버튼을 눌러 주세요' : '시뮬레이션 시작 버튼을 눌러 주세요', 'waiting');
  }
}

document.querySelectorAll('.tabs button').forEach((b) => {
  b.addEventListener('click', () => setMode(b.dataset.mode));
});

// 수동 모드
slider.addEventListener('input', () => showSpeed(Number(slider.value)));
document.querySelectorAll('.presets button').forEach((button) => {
  button.addEventListener('click', () => {
    slider.value = button.dataset.speed;
    showSpeed(Number(button.dataset.speed));
  });
});

// GPS 모드
gpsButton.addEventListener('click', () => {
  if (stopSource) {
    stopCurrentSource();
    showSpeed(0);
    setStatus('GPS를 멈췄어요', 'waiting');
    return;
  }
  startSource(startRealGps);
  gpsButton.textContent = 'GPS 중지';
  gpsButton.classList.add('running');
});

// 시뮬레이션 모드
for (const [key, { name }] of Object.entries(SCENARIOS)) {
  simScenario.add(new Option(name, key));
}

simButton.addEventListener('click', () => {
  if (stopSource) {
    stopCurrentSource();
    showSpeed(0);
    setStatus('시뮬레이션을 멈췄어요', 'waiting');
    return;
  }
  const options = { noise: $('sim-noise').checked };
  startSource((onPosition) =>
    startSimulation(simScenario.value, options, onPosition, ({ kmh, label }) => {
      $('truth-text').textContent = kmh.toFixed(1);
      $('truth-label').textContent = `· ${label}`;
    })
  );
  $('truth-card').hidden = false;
  simButton.textContent = '시뮬레이션 중지';
  simButton.classList.add('running');
});

setMode('manual'); // 처음엔 수동 모드

// 5) 달리기 기록: 시작 / 일시정지 / 종료
const startButton = $('start-button');
const pauseButton = $('pause-button');
const finishButton = $('finish-button');
const keepAwake = $('keep-awake');
let session = null; // 지금 달리는 중인 기록 (없으면 null)

// "화면 켜두기" 선택은 기억해 둠
try {
  keepAwake.checked = localStorage.getItem('runningBattle.keepAwake') === '1';
} catch {
  // 무시
}
keepAwake.addEventListener('change', () => {
  try {
    localStorage.setItem('runningBattle.keepAwake', keepAwake.checked ? '1' : '0');
  } catch {
    // 무시
  }
  if (session?.state === 'running') setKeepAwake(keepAwake.checked);
});

function updateRunUi() {
  const state = session?.state ?? 'idle';
  startButton.hidden = state !== 'idle';
  pauseButton.hidden = state === 'idle';
  finishButton.hidden = state === 'idle';
  pauseButton.textContent = state === 'paused' ? '▶ 다시 달리기' : '⏸ 일시정지';
  // 달리는 도중에는 입력 방식을 못 바꾸게
  document.querySelectorAll('.tabs button').forEach((b) => (b.disabled = state !== 'idle'));
  gpsButton.disabled = state !== 'idle';
  simButton.disabled = state !== 'idle';

  const runState = $('run-state');
  runState.dataset.state = state;
  runState.textContent = { idle: '● 대기 중', running: '● 기록 중', paused: '● 일시정지' }[state];
}

startButton.addEventListener('click', () => {
  session = new RunSession(currentMode);
  lastGoodPos = null;
  gapFrom = null;
  // GPS/시뮬레이션 모드면 위치 받기도 같이 시작
  if (currentMode === 'gps' && !stopSource) gpsButton.click();
  if (currentMode === 'sim' && !stopSource) simButton.click();
  setKeepAwake(keepAwake.checked);
  saveActiveRun(session.toJSON());
  updateRunUi();
});

pauseButton.addEventListener('click', () => {
  if (session.state === 'running') {
    session.pause();
    setKeepAwake(false);
  } else {
    session.resume();
    setKeepAwake(keepAwake.checked);
  }
  saveActiveRun(session.toJSON());
  updateRunUi();
});

finishButton.addEventListener('click', () => {
  if (!confirm('달리기를 끝내고 기록을 저장할까요?')) return;
  session.finish();
  const record = session.toJSON();
  session = null;
  clearActiveRun();
  setKeepAwake(false);
  if (currentMode !== 'manual') {
    stopCurrentSource();
    showSpeed(0);
  }
  updateRunUi();

  if (record.elapsedMs < 10000) {
    setStatus('10초보다 짧은 기록은 저장하지 않아요', 'waiting');
    return;
  }
  setStatus('');
  saveRecordAndShow(record);
});

function saveRecordAndShow(record, extraNote) {
  saveRecord(record);
  refreshRecords();
  showResult(record, { onDelete: removeRecord, extraNote });
}

function removeRecord(record) {
  deleteRecord(record.id);
  refreshRecords();
}

function refreshRecords() {
  renderRecordList(loadRecords(), (r) => showResult(r, { onDelete: removeRecord }));
}

// 화면이 꺼졌다 켜졌을 때 거리 채우기:
// 공백 직전의 마지막 위치(gapFrom)와 공백 후 첫 위치 사이 직선거리를 더함
let lastGoodPos = null;
let gapFrom = null;
const MAX_GAP_KMH = 40; // 이보다 빠르면 (차를 탔거나 위치가 튄 것) 더하지 않음

function onPositionForRun(pos) {
  if (pos.accuracy > MAX_ACCURACY_M) return;
  if (gapFrom && session?.state === 'running') {
    const meters = distanceBetween(gapFrom, pos);
    const hours = (pos.time - gapFrom.time) / 3600000;
    if (hours > 0 && meters / 1000 / hours <= MAX_GAP_KMH) session.addDistance(meters, true);
  }
  gapFrom = null;
  lastGoodPos = pos;
}

// 0.25초마다 기록 갱신 + 게임 화면(HUD)에 전달
let lastSnapshot = 0;
setInterval(() => {
  if (session) {
    const hadGap = session.tick(Date.now(), currentKmh);
    if (hadGap && lastGoodPos) gapFrom = lastGoodPos;
    // 5초마다 진행 상황 저장 (앱이 갑자기 닫혀도 기록이 남도록)
    if (Date.now() - lastSnapshot > 5000) {
      saveActiveRun(session.toJSON());
      lastSnapshot = Date.now();
    }
  }
  game.registry.set('runStats', session ? { elapsedMs: session.elapsedMs, distanceM: session.distanceM } : null);
}, 250);

// 화면이 꺼지거나 다른 앱으로 갈 때 바로 저장
document.addEventListener('visibilitychange', () => {
  if (session && document.visibilityState === 'hidden') saveActiveRun(session.toJSON());
});

// 앱이 달리는 도중에 닫혔었다면, 저장된 지점까지를 기록으로 남김
const unfinished = loadActiveRun();
if (unfinished) {
  clearActiveRun();
  const recovered = RunSession.fromJSON(unfinished);
  recovered.recovered = true;
  recovered.finish(recovered.lastTick);
  const record = recovered.toJSON();
  if (record.elapsedMs >= 10000) saveRecordAndShow(record);
}

refreshRecords();
updateRunUi();

// 6) PWA: 서비스 워커 등록 → 한 번 열어 두면 인터넷 없이도 실행됨
// 개발 중(npm run dev)에는 옛 파일이 저장돼서 헷갈리지 않도록 배포 버전에서만 켬
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch((e) => console.warn('서비스 워커 등록 실패', e));
  });
}
