import Phaser from 'phaser';
import { RunScene, WIDTH, HEIGHT } from './RunScene.js';

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

// 2) 슬라이더와 화면 숫자 연결
const slider = document.getElementById('speed-slider');
const speedText = document.getElementById('speed-text');
const paceText = document.getElementById('pace-text');

// 속도(km/h) -> 페이스("분:초" per km) 변환
// 예) 10 km/h  ->  1km에 6분  ->  "6:00"
function formatPace(kmh) {
  if (kmh < 1) return '--:--'; // 너무 느리면 페이스 의미가 없음
  const secondsPerKm = Math.round(3600 / kmh);
  const min = Math.floor(secondsPerKm / 60);
  const sec = secondsPerKm % 60;
  return `${min}:${String(sec).padStart(2, '0')}`;
}

function setSpeed(kmh) {
  slider.value = kmh;
  speedText.textContent = kmh.toFixed(1);
  paceText.textContent = formatPace(kmh);
  // registry = 게임 안팎에서 같이 쓰는 공용 저장소. RunScene이 이 값을 읽어감
  game.registry.set('targetSpeedKmh', kmh);
}

slider.addEventListener('input', () => setSpeed(Number(slider.value)));

document.querySelectorAll('.presets button').forEach((button) => {
  button.addEventListener('click', () => setSpeed(Number(button.dataset.speed)));
});

setSpeed(Number(slider.value)); // 처음 값으로 시작
