import Phaser from 'phaser';
import { Runner } from './Runner.js';

export const WIDTH = 960;
export const HEIGHT = 540;

const GROUND_Y = 430; // 땅이 시작되는 높이(픽셀)
const RUNNER_X = 260; // 아바타가 서 있는 가로 위치(아바타는 제자리, 배경이 움직임)
const PIXELS_PER_METER = 40; // 게임 화면에서 1m = 40픽셀
const MARKER_EVERY_METERS = 50; // 몇 m마다 거리 표지판을 세울지

// 배경 층별 이동 비율. 멀리 있을수록 천천히 움직여야 입체감이 생김(패럴랙스)
const PARALLAX = {
  clouds: 0.05,
  mountains: 0.15,
  hills: 0.4,
  ground: 1,
};

export class RunScene extends Phaser.Scene {
  constructor() {
    super('RunScene');
  }

  create() {
    this.makeTextures();

    // 하늘 (위는 진한 파랑, 아래는 연한 파랑 그라데이션)
    const sky = this.add.graphics();
    sky.fillGradientStyle(0x6bbcf0, 0x6bbcf0, 0xd9f1ff, 0xd9f1ff, 1);
    sky.fillRect(0, 0, WIDTH, GROUND_Y);
    this.add.circle(820, 90, 42, 0xfff3b0);

    // 배경 층들: tileSprite는 같은 그림을 무한히 이어 붙여서 스크롤할 수 있게 해줌
    this.clouds = this.add.tileSprite(0, 30, WIDTH, 120, 'clouds').setOrigin(0);
    this.mountains = this.add.tileSprite(0, GROUND_Y - 190, WIDTH, 200, 'mountains').setOrigin(0);
    this.hills = this.add.tileSprite(0, GROUND_Y - 130, WIDTH, 140, 'hills').setOrigin(0);
    this.ground = this.add.tileSprite(0, GROUND_Y, WIDTH, HEIGHT - GROUND_Y, 'ground').setOrigin(0);

    // 거리 표지판 (예: "50m")
    this.nextMarkerMeters = MARKER_EVERY_METERS;
    this.marker = this.add.container(0, GROUND_Y + 8);
    const post = this.add.rectangle(0, -30, 6, 60, 0x6b4a2b);
    const board = this.add.rectangle(0, -66, 64, 28, 0xfff8e7).setStrokeStyle(3, 0x6b4a2b);
    this.markerText = this.add
      .text(0, -66, '', { fontFamily: 'sans-serif', fontSize: '16px', color: '#3b2a20', fontStyle: 'bold' })
      .setOrigin(0.5);
    this.marker.add([post, board, this.markerText]);
    this.updateMarkerText();

    // 오리지널 캐릭터
    this.runner = new Runner(this, RUNNER_X, GROUND_Y + 46);

    // 화면 왼쪽 위 거리 표시
    this.distanceText = this.add.text(20, 16, '', {
      fontFamily: 'sans-serif',
      fontSize: '26px',
      color: '#ffffff',
      fontStyle: 'bold',
      stroke: '#1d2333',
      strokeThickness: 5,
    });

    this.currentSpeedKmh = 0; // 실제 화면에 쓰는 속도 (목표 속도를 부드럽게 따라감)
    this.distanceMeters = 0; // 지금까지 달린 거리
  }

  // update는 1초에 약 60번 자동으로 불림. delta = 지난 프레임 이후 흐른 시간(ms)
  update(time, delta) {
    const dt = delta / 1000; // 초 단위로 변환

    // 1) 속도: 슬라이더 값으로 갑자기 바뀌지 않고 서서히 가속/감속
    const targetSpeedKmh = this.registry.get('targetSpeedKmh') ?? 0;
    this.currentSpeedKmh += (targetSpeedKmh - this.currentSpeedKmh) * Math.min(1, dt * 3);
    if (Math.abs(this.currentSpeedKmh) < 0.01) this.currentSpeedKmh = 0;

    // 2) 거리: km/h -> m/s 로 바꿔서 흐른 시간만큼 더함
    const speedMps = this.currentSpeedKmh / 3.6;
    this.distanceMeters += speedMps * dt;

    // 3) 배경 스크롤: 1초에 움직일 픽셀 = 초속(m/s) × 1m당 픽셀
    const scrollPx = speedMps * PIXELS_PER_METER * dt;
    this.clouds.tilePositionX += scrollPx * PARALLAX.clouds + 4 * dt; // 구름은 바람에 조금씩 흘러감
    this.mountains.tilePositionX += scrollPx * PARALLAX.mountains;
    this.hills.tilePositionX += scrollPx * PARALLAX.hills;
    this.ground.tilePositionX += scrollPx * PARALLAX.ground;

    // 4) 거리 표지판: "표지판까지 남은 거리"만큼 아바타 앞쪽에 배치
    this.marker.x = RUNNER_X + (this.nextMarkerMeters - this.distanceMeters) * PIXELS_PER_METER;
    if (this.marker.x < -60) {
      this.nextMarkerMeters += MARKER_EVERY_METERS;
      this.updateMarkerText();
    }

    // 5) 아바타 애니메이션
    this.runner.update(this.currentSpeedKmh, dt, time / 1000);

    // 6) 거리 글자
    this.distanceText.setText(`🏁 ${formatDistance(this.distanceMeters)}`);
  }

  updateMarkerText() {
    this.markerText.setText(formatDistance(this.nextMarkerMeters));
  }

  // 그림 파일 없이 코드로 배경 그림(텍스처)을 만듦
  makeTextures() {
    const draw = (key, width, height, paint) => {
      const g = this.make.graphics({}, false);
      paint(g);
      g.generateTexture(key, width, height);
      g.destroy();
    };

    // 구름
    draw('clouds', 960, 120, (g) => {
      g.fillStyle(0xffffff, 0.9);
      for (const [x, y] of [[150, 55], [520, 35], [810, 70]]) {
        g.fillEllipse(x, y, 90, 36);
        g.fillEllipse(x - 35, y + 8, 60, 26);
        g.fillEllipse(x + 38, y + 6, 66, 28);
      }
    });

    // 먼 산 (왼쪽 끝과 오른쪽 끝 높이가 같아야 이어 붙였을 때 자연스러움)
    draw('mountains', 640, 200, (g) => {
      g.fillStyle(0x93b4d6);
      g.fillPoints(
        [
          { x: 0, y: 200 }, { x: 0, y: 120 }, { x: 80, y: 60 }, { x: 160, y: 110 },
          { x: 260, y: 30 }, { x: 360, y: 100 }, { x: 450, y: 50 }, { x: 560, y: 120 },
          { x: 640, y: 120 }, { x: 640, y: 200 },
        ],
        true
      );
      g.fillStyle(0xf4f8ff);
      g.fillTriangle(237, 48, 260, 30, 286, 48);
    });

    // 가까운 언덕과 나무
    draw('hills', 800, 140, (g) => {
      const hillY = (x) => 80 + 18 * Math.sin((x / 800) * Math.PI * 4) + 8 * Math.sin((x / 800) * Math.PI * 6);
      const points = [];
      for (let x = 0; x <= 800; x += 10) points.push({ x, y: hillY(x) });
      points.push({ x: 800, y: 140 }, { x: 0, y: 140 });
      g.fillStyle(0x7cc576);
      g.fillPoints(points, true);

      for (const x of [120, 330, 520, 700]) {
        const y = hillY(x);
        g.fillStyle(0x6b4a2b);
        g.fillRect(x - 3, y - 14, 6, 16);
        g.fillStyle(0x3f9b4f);
        g.fillCircle(x, y - 26, 16);
      }
    });

    // 땅: 잔디 + 빨간 트랙 + 흰색 레인 선
    draw('ground', 64, HEIGHT - GROUND_Y, (g) => {
      g.fillStyle(0x6cc04a);
      g.fillRect(0, 0, 64, 8);
      g.fillStyle(0xd9653b);
      g.fillRect(0, 8, 64, 64);
      g.fillStyle(0xffffff);
      g.fillRect(0, 12, 64, 2);
      g.fillRect(0, 40, 32, 3); // 점선: 움직이는 게 잘 보이게 해줌
      g.fillRect(0, 68, 64, 2);
      g.fillStyle(0x5aa83c);
      g.fillRect(0, 72, 64, HEIGHT - GROUND_Y - 72);
      g.fillStyle(0x4a9431);
      g.fillRect(12, 84, 4, 6);
      g.fillRect(44, 96, 4, 6);
    });
  }
}

function formatDistance(meters) {
  if (meters < 1000) return `${Math.floor(meters)} m`;
  return `${(meters / 1000).toFixed(2)} km`;
}
