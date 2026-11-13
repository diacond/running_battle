import Phaser from 'phaser';
import { RunScene, WIDTH, HEIGHT } from './RunScene.js';
import { GpsSpeedTracker, MAX_ACCURACY_M, distanceBetween } from './speed/GpsSpeedTracker.js';
import { startRealGps } from './speed/realGps.js';
import { startSimulation, SCENARIOS } from './speed/simulatedGps.js';
import { formatPace, formatDuration } from './format.js';
import { RunSession } from './run/RunSession.js';
import { loadRecords, saveRecord, deleteRecord, saveActiveRun, loadActiveRun, clearActiveRun } from './run/records.js';
import { showResult, renderRecordList } from './run/resultView.js';
import { setKeepAwake } from './wakeLock.js';
import { loadLook, createLookEditor } from './lookEditor.js';
import { askConfirm } from './ui/confirm.js';

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

// 캐릭터 외형: 저장된 것을 불러와서 게임에 전달하고, 꾸미기 패널 만들기
game.registry.set('look', loadLook());
createLookEditor(document.getElementById('look-editor'), game.registry.get('look'), (look) =>
  game.registry.set('look', look)
);

// 2) 화면 요소 가져오기
const $ = (id) => document.getElementById(id);
const slider = $('speed-slider');
const statusBox = $('status');
const topPill = $('top-pill');
const simScenario = $('sim-scenario');

// 설정값을 기억해 두는 작은 도우미 (저장이 안 되는 환경이면 그냥 넘어감)
const prefs = {
  get(key, fallback) {
    try {
      return localStorage.getItem(`runningBattle.${key}`) ?? fallback;
    } catch {
      return fallback;
    }
  },
  set(key, value) {
    try {
      localStorage.setItem(`runningBattle.${key}`, value);
    } catch {
      // 무시
    }
  },
};

// 3) 아래 탭 메뉴: 달리기 / 기록 / 꾸미기 / 설정
const gameBox = $('game');
function showTab(tab) {
  document.querySelectorAll('.nav button').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.tab === tab)));
  document.querySelectorAll('[data-page]').forEach((page) => (page.hidden = page.dataset.page !== tab));
  // 게임 화면은 하나뿐이라, 꾸미기 탭에서는 그쪽으로 옮겨서 캐릭터를 보여 줌
  const home = tab === 'look' ? $('look-game-slot') : document.querySelector('[data-page="run"]');
  if (gameBox.parentElement !== home) {
    home.prepend(gameBox);
    game.scale.refresh();
  }
  window.scrollTo(0, 0);
}
document.querySelectorAll('.nav button').forEach((b) => b.addEventListener('click', () => showTab(b.dataset.tab)));

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

// text: 버튼 아래 작은 설명 / level: 위쪽 동그라미 색 (good, waiting, weak, lost, error) / pillText: 위쪽 글자
let signal = { text: '', level: '' };
function setStatus(text, level = '', pillText = '') {
  statusBox.textContent = text;
  signal = { text: pillText, level };
  updatePill();
}

// 4) GPS 계산 결과를 화면에 보여주기 (실제 GPS와 시뮬레이션이 같이 씀)
const tracker = new GpsSpeedTracker();
let stopSource = null; // 지금 돌고 있는 GPS/시뮬레이션을 멈추는 함수
let errorText = '';

function renderTracker() {
  showSpeed(tracker.speedKmh);
  if (errorText) return setStatus(errorText, 'error', 'GPS 오류');

  const acc = tracker.lastAccuracy != null ? `오차 ±${Math.round(tracker.lastAccuracy)}m` : '';
  const since = tracker.secondsSinceLast();
  // 원인 찾기용 정보: 받은 횟수, 마지막으로 받은 지 몇 초
  const info = since == null ? '아직 수신 없음' : `${tracker.count}회 수신 · ${Math.floor(since)}초 전`;
  const messages = {
    waiting: ['신호 받는 중… 몇 초만 기다려 주세요', '신호 찾는 중'],
    good: [`신호 양호 · ${acc}`, '신호 양호'],
    weak: [`신호 약함 · ${acc} → 이 위치는 버려요`, '신호 약함'],
    still: ['위치 변화 없음 → 멈춰 있는 것으로 봐요', '신호 양호'],
    lost: ['신호 끊김 · 하늘이 트인 곳으로 가 보세요', '신호 끊김'],
  };
  const [text, pill] = messages[tracker.status];
  setStatus(`${text} (${info})`, tracker.status === 'still' ? 'good' : tracker.status, `GPS ${pill}`);
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

function startSim() {
  const options = { noise: $('sim-noise').checked };
  startSource((onPosition) =>
    startSimulation(simScenario.value, options, onPosition, ({ kmh, label }) => {
      $('truth-text').textContent = kmh.toFixed(1);
      $('truth-label').textContent = `· ${label}`;
    })
  );
  $('truth-card').hidden = false;
}

function stopCurrentSource() {
  stopSource?.();
  stopSource = null;
  $('truth-card').hidden = true;
}

// 1초마다 신호 끊김 확인
setInterval(() => {
  if (!stopSource) return;
  tracker.checkLost();
  renderTracker();
}, 1000);

// 5) 속도 재는 방법 (설정 탭): GPS / 수동 / 시뮬레이션
for (const [key, { name }] of Object.entries(SCENARIOS)) {
  simScenario.add(new Option(name, key));
}

// 처음엔 지난번에 고른 방법. 처음 쓰는 거라면 폰은 GPS, PC는 수동
const isPhone = matchMedia('(pointer: coarse)').matches;
let currentMode = prefs.get('mode', isPhone ? 'gps' : 'manual');
if (!['gps', 'manual', 'sim'].includes(currentMode)) currentMode = 'manual';

function setMode(mode) {
  currentMode = mode;
  prefs.set('mode', mode);
  stopCurrentSource();
  document.querySelectorAll('#mode-buttons button').forEach((b) => {
    b.setAttribute('aria-pressed', String(b.dataset.mode === mode));
  });
  document.querySelectorAll('[data-mode-hint]').forEach((el) => (el.hidden = el.dataset.modeHint !== mode));
  $('manual-controls').hidden = mode !== 'manual';

  if (mode === 'manual') {
    showSpeed(Number(slider.value));
    setStatus('', '', '수동 모드');
  } else if (mode === 'gps') {
    // GPS는 미리 켜서 신호를 잡아 둠 → 시작 누르자마자 정확하게 잴 수 있음
    startSource(startRealGps);
  } else {
    showSpeed(0);
    setStatus('▶ 시작을 누르면 가짜 GPS가 움직여요', '', '시뮬레이션');
  }
}

document.querySelectorAll('#mode-buttons button').forEach((b) => {
  b.addEventListener('click', () => setMode(b.dataset.mode));
});

// 수동 모드: 슬라이더와 빠른 선택 버튼
slider.addEventListener('input', () => showSpeed(Number(slider.value)));
document.querySelectorAll('.presets button').forEach((button) => {
  button.addEventListener('click', () => {
    slider.value = button.dataset.speed;
    showSpeed(Number(button.dataset.speed));
  });
});

// 6) 달리기 기록: 시작 / 일시정지 / 종료
const startButton = $('start-button');
const pauseButton = $('pause-button');
const finishButton = $('finish-button');
const keepAwake = $('keep-awake');
let session = null; // 지금 달리는 중인 기록 (없으면 null)

// "화면 켜두기" 선택은 기억해 둠
keepAwake.checked = prefs.get('keepAwake', '0') === '1';
keepAwake.addEventListener('change', () => {
  prefs.set('keepAwake', keepAwake.checked ? '1' : '0');
  if (session?.state === 'running') setKeepAwake(keepAwake.checked);
});

// 위쪽 동그라미: 달리는 중이면 기록 상태, 아니면 신호 상태
function updatePill() {
  const state = session?.state ?? 'idle';
  topPill.dataset.state = state;
  if (state === 'idle') {
    topPill.textContent = signal.text || '대기 중';
    topPill.dataset.level = signal.level;
  } else {
    topPill.textContent = state === 'running' ? '기록 중' : '일시정지';
    topPill.dataset.level = '';
  }
}

function updateRunUi() {
  const state = session?.state ?? 'idle';
  startButton.hidden = state !== 'idle';
  pauseButton.hidden = state === 'idle';
  finishButton.hidden = state === 'idle';
  pauseButton.textContent = state === 'paused' ? '▶ 계속' : '⏸ 일시정지';
  // 달리는 도중에는 속도 재는 방법을 못 바꾸게
  document.querySelectorAll('#mode-buttons button').forEach((b) => (b.disabled = state !== 'idle'));
  $('mode-locked').hidden = state === 'idle';
  updatePill();
}

// 큰 숫자 판(시간·거리) 갱신
function renderStats() {
  $('time-text').textContent = formatDuration((session?.elapsedMs ?? 0) / 1000);
  $('dist-text').textContent = ((session?.distanceM ?? 0) / 1000).toFixed(2);
}

startButton.addEventListener('click', () => {
  session = new RunSession(currentMode);
  lastGoodPos = null;
  gapFrom = null;
  // GPS/시뮬레이션이 꺼져 있으면 같이 켬
  if (currentMode === 'gps' && !stopSource) startSource(startRealGps);
  if (currentMode === 'sim' && !stopSource) startSim();
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

finishButton.addEventListener('click', async () => {
  const ok = await askConfirm({
    title: '달리기를 끝낼까요?',
    text: '지금까지의 기록이 저장돼요.',
    yes: '끝내기',
    no: '계속 달리기',
  });
  if (!ok || !session) return;
  session.finish();
  const record = session.toJSON();
  session = null;
  clearActiveRun();
  setKeepAwake(false);
  if (currentMode === 'gps') {
    // 배터리 아끼기: 끝나면 GPS도 끔 (다시 ▶ 시작을 누르면 켜짐)
    stopCurrentSource();
    showSpeed(0);
    setStatus('GPS를 껐어요. ▶ 시작을 누르면 다시 켜져요', '', 'GPS 꺼짐');
  } else if (currentMode === 'sim') {
    stopCurrentSource();
    showSpeed(0);
    setStatus('', '', '시뮬레이션');
  }
  updateRunUi();
  renderStats();

  if (record.elapsedMs < 10000) {
    statusBox.textContent = '10초보다 짧은 기록은 저장하지 않아요';
    return;
  }
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
  const records = loadRecords();
  renderRecordList(records, (r) => showResult(r, { onDelete: removeRecord }));
  // 기록 탭 맨 위 요약
  const totalM = records.reduce((sum, r) => sum + r.distanceM, 0);
  const totalMin = Math.floor(records.reduce((sum, r) => sum + r.elapsedMs, 0) / 60000);
  $('total-count').textContent = records.length;
  $('total-dist').textContent = (totalM / 1000).toFixed(1);
  const h = Math.floor(totalMin / 60);
  $('total-time').textContent = h > 0 ? `${h}시간 ${totalMin % 60}분` : `${totalMin}분`;
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

// 0.25초마다 기록 갱신 + 화면 숫자 갱신
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
  renderStats();
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

setMode(currentMode);
refreshRecords();
updateRunUi();

// 7) PWA: 서비스 워커 등록 → 한 번 열어 두면 인터넷 없이도 실행됨
// 개발 중(npm run dev)에는 옛 파일이 저장돼서 헷갈리지 않도록 배포 버전에서만 켬
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch((e) => console.warn('서비스 워커 등록 실패', e));
  });
}
