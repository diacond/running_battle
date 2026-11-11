import Phaser from 'phaser';
import { RunScene, WIDTH, HEIGHT } from './RunScene.js';
import { GpsSpeedTracker } from './speed/GpsSpeedTracker.js';
import { startRealGps } from './speed/realGps.js';
import { startSimulation, SCENARIOS } from './speed/simulatedGps.js';
import { formatPace } from './format.js';

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
function showSpeed(kmh) {
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
function setMode(mode) {
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
