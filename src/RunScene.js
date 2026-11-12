import Phaser from 'phaser';
import { Runner } from './Runner.js';
import { THEMES, themeForHour } from './themes.js';
import { formatPace, formatDistance, formatDuration } from './format.js';

export const WIDTH = 960;
export const HEIGHT = 540;

// ── 카메라 설정 (뒤에서 따라가는 시점) ──────────────────────────────
// 원근법: 멀리 있는 것(z가 큰 것)일수록 작고 지평선 가까이에 그려짐
//   화면 x = 가운데 + 가로위치 × (FOCAL / 거리)
//   화면 y = 지평선 + (카메라높이 - 물체높이) × (FOCAL / 거리)
const HORIZON_Y = 220; // 지평선 높이(픽셀)
const CENTER_X = WIDTH / 2;
const FOCAL = 500; // 렌즈 배율 (클수록 확대)
const CAM_HEIGHT = 2; // 카메라 높이(m)
const NEAR_Z = (FOCAL * CAM_HEIGHT) / (HEIGHT - HORIZON_Y); // 화면 맨 아래에 보이는 땅까지 거리(m)
const FAR_Z = 90; // 이보다 먼 곳은 안개로 가림

// ── 트랙 (8레인, 레인 폭 1.22m. 캐릭터는 가운데 레인) ─────────────
const LANE_W = 1.22;
const LANE_COUNT = 8;
const TRACK_LEFT = -LANE_W / 2 - 3 * LANE_W;
const TRACK_RIGHT = TRACK_LEFT + LANE_W * LANE_COUNT;
const LAMP_EVERY = 20; // 가로등 간격(m)

const RUNNER_SCREEN_Y = 440; // 캐릭터 발 위치(픽셀)

// 땅 위의 점(x, z)을 화면 좌표로. h = 땅에서의 높이(m)
function project(x, z, h = 0) {
  const s = FOCAL / z;
  return { x: CENTER_X + x * s, y: HORIZON_Y + (CAM_HEIGHT - h) * s, s };
}

export class RunScene extends Phaser.Scene {
  constructor() {
    super('RunScene');
  }

  create() {
    this.currentSpeedKmh = 0; // 화면에 쓰는 속도 (목표 속도를 부드럽게 따라감)
    this.distanceMeters = 0; // 화면이 앞으로 간 거리 (트랙 무늬를 움직이는 용도. 기록은 main.js의 RunSession이 함)

    this.sky = this.add.graphics(); // 하늘·산 (시간대가 바뀔 때만 다시 그림)
    this.world = this.add.graphics(); // 트랙·잔디·가로등 (매 프레임 다시 그림)
    this.look = null;
    this.runner = null;
    this.updateRunner(); // 캐릭터 (외형은 registry의 'look'에서 읽음)
    this.createHud();

    this.themeKey = null;
    this.updateTheme();
  }

  // update는 1초에 약 60번 자동으로 불림. delta = 지난 프레임 이후 흐른 시간(ms)
  update(time, delta) {
    const dt = delta / 1000;

    // 1) 속도: 슬라이더/GPS 값을 서서히 따라감
    const target = this.registry.get('targetSpeedKmh') ?? 0;
    this.currentSpeedKmh += (target - this.currentSpeedKmh) * Math.min(1, dt * 3);
    if (Math.abs(this.currentSpeedKmh) < 0.01) this.currentSpeedKmh = 0;

    // 2) 화면을 앞으로 이동
    this.distanceMeters += (this.currentSpeedKmh / 3.6) * dt;

    // 3) 그리기
    this.updateTheme();
    this.updateRunner();
    this.drawWorld();
    this.runner.update(this.currentSpeedKmh, dt, time / 1000);
    this.updateHud();
  }

  // 캐릭터 꾸미기에서 외형이 바뀌면 캐릭터를 새로 만듦
  updateRunner() {
    const look = this.registry.get('look');
    if (this.runner && look === this.look) return;
    this.look = look;
    this.runner?.destroy();
    this.runner = new Runner(this, CENTER_X, RUNNER_SCREEN_Y, look ?? undefined).setDepth(10);
  }

  // ── 시간대(밤낮) ──────────────────────────────────────────────
  updateTheme() {
    const override = this.registry.get('themeOverride'); // 테스트용 강제 선택
    const key = override && override !== 'auto' ? override : themeForHour(new Date().getHours());
    if (key === this.themeKey) return;
    this.themeKey = key;
    this.theme = THEMES[key];
    this.drawSky();
  }

  drawSky() {
    const t = this.theme;
    const g = this.sky;
    g.clear();

    g.fillGradientStyle(t.skyTop, t.skyTop, t.skyBottom, t.skyBottom, 1);
    g.fillRect(0, 0, WIDTH, HORIZON_Y);

    if (this.themeKey === 'night') {
      // 별 (매번 같은 자리에 찍히도록 고정된 규칙으로 위치 계산)
      for (let i = 0; i < 70; i++) {
        const x = (i * 137.5) % WIDTH;
        const y = ((i * 71.3) % (HORIZON_Y - 40)) + 6;
        g.fillStyle(0xffffff, 0.35 + ((i * 13) % 10) / 15);
        g.fillCircle(x, y, i % 7 === 0 ? 1.8 : 1.1);
      }
      g.fillStyle(0xf4f1d0);
      g.fillCircle(780, 70, 26); // 달
      g.fillStyle(t.skyTop);
      g.fillCircle(792, 62, 22); // 초승달 모양 만들기
    } else if (this.themeKey === 'evening') {
      g.fillStyle(0xffc36b, 0.35);
      g.fillCircle(720, HORIZON_Y - 75, 60);
      g.fillStyle(0xffb35c);
      g.fillCircle(720, HORIZON_Y - 75, 36); // 지는 해
    } else {
      g.fillStyle(0xfff3b0, 0.4);
      g.fillCircle(790, 70, 52);
      g.fillStyle(0xfff3b0);
      g.fillCircle(790, 70, 36); // 해
      g.fillStyle(0xffffff, 0.9);
      for (const [x, y] of [[440, 50], [620, 125]]) {
        g.fillEllipse(x, y, 110, 36);
        g.fillEllipse(x - 40, y + 8, 70, 26);
        g.fillEllipse(x + 44, y + 6, 76, 28);
      }
    }

    // 먼 산과 가까운 언덕 (지평선 위에 고정)
    this.drawHills(g, t.farHills, 55, [0.9, 2.3], 22);
    this.drawHills(g, t.nearHills, 26, [1.7, 3.9], 10);
  }

  drawHills(g, color, height, waves, wobble) {
    const points = [{ x: 0, y: HORIZON_Y }];
    for (let x = 0; x <= WIDTH; x += 12) {
      const y =
        HORIZON_Y - height + wobble * Math.sin((x / WIDTH) * Math.PI * 2 * waves[0]) +
        wobble * 0.6 * Math.sin((x / WIDTH) * Math.PI * 2 * waves[1] + 1);
      points.push({ x, y });
    }
    points.push({ x: WIDTH, y: HORIZON_Y });
    g.fillStyle(color);
    g.fillPoints(points, true);
  }

  // ── 트랙 그리기 (매 프레임) ────────────────────────────────────
  drawWorld() {
    const t = this.theme;
    const g = this.world;
    g.clear();

    // 잔디 바탕 + 잔디 줄무늬(4m마다). 줄무늬가 다가오면서 달리는 느낌을 줌
    g.fillStyle(t.grass);
    g.fillRect(0, HORIZON_Y, WIDTH, HEIGHT - HORIZON_Y);
    g.fillStyle(t.grassDark);
    this.forEachStripe(8, 4, (zNear, zFar) => {
      const yNear = project(0, zNear).y;
      const yFar = project(0, zFar).y;
      g.fillRect(0, yFar, WIDTH, yNear - yFar);
    });

    // 트랙 바탕 + 은은한 줄무늬(2m마다)
    g.fillStyle(t.track);
    this.fillGroundQuad(g, TRACK_LEFT, TRACK_RIGHT, NEAR_Z, FAR_Z);
    g.fillStyle(t.trackDark);
    this.forEachStripe(4, 2, (zNear, zFar) => this.fillGroundQuad(g, TRACK_LEFT, TRACK_RIGHT, zNear, zFar));

    // 50m마다 트랙을 가로지르는 흰 선
    g.fillStyle(t.line, 0.85);
    this.forEachStripe(50, 0.15, (zNear, zFar) => this.fillGroundQuad(g, TRACK_LEFT, TRACK_RIGHT, zNear, zFar));

    // 레인 선 (바깥 선은 조금 더 굵게)
    g.fillStyle(t.line);
    for (let i = 0; i <= LANE_COUNT; i++) {
      const x = TRACK_LEFT + i * LANE_W;
      const half = i === 0 || i === LANE_COUNT ? 0.06 : 0.035;
      this.fillGroundQuad(g, x - half, x + half, NEAR_Z, FAR_Z);
    }

    this.drawLamps(g);

    // 지평선 근처 안개 (먼 곳을 자연스럽게 흐리게)
    g.fillGradientStyle(t.fog, t.fog, t.fog, t.fog, 0.75, 0.75, 0, 0);
    g.fillRect(0, HORIZON_Y, WIDTH, 32);
  }

  // 가로등: 트랙 양옆에 20m마다. 저녁/밤에는 불이 켜짐
  drawLamps(g) {
    const t = this.theme;
    const sides = [
      { x: TRACK_LEFT - 1.6, dir: 1 },
      { x: TRACK_RIGHT + 1.6, dir: -1 },
    ];
    // 먼 것부터 그려야 가까운 것이 위에 덮임
    const first = Math.ceil((this.distanceMeters + NEAR_Z) / LAMP_EVERY);
    const last = Math.floor((this.distanceMeters + FAR_Z) / LAMP_EVERY);
    for (let k = last; k >= first; k--) {
      const z = k * LAMP_EVERY - this.distanceMeters;
      for (const { x, dir } of sides) {
        const base = project(x, z);
        const top = project(x, z, 5);
        const head = project(x + dir * 0.9, z, 4.9);
        const s = base.s;

        if (t.lampLight > 0) {
          // 땅에 비치는 불빛
          const pool = project(x + dir * 1.5, z);
          g.fillStyle(0xffe9a8, 0.12 * t.lampLight);
          g.fillEllipse(pool.x, pool.y, 5 * s, 5 * s * (CAM_HEIGHT / z) * 1.6);
        }

        g.fillStyle(t.pole);
        g.fillRect(base.x - 0.07 * s, top.y, 0.14 * s, base.y - top.y); // 기둥
        g.fillRect(Math.min(top.x, head.x), top.y, Math.abs(head.x - top.x), 0.1 * s); // 팔
        g.fillStyle(t.lampLight > 0 ? 0xfff2c4 : 0xdfe3ea);
        g.fillRect(head.x - 0.3 * s, head.y, 0.6 * s, 0.15 * s); // 전등

        if (t.lampLight > 0) {
          g.fillStyle(0xffe9a8, 0.25 * t.lampLight);
          g.fillCircle(head.x, head.y + 0.1 * s, 0.7 * s);
        }
      }
    }
  }

  // 땅 위의 사각형(가로 xLeft~xRight, 거리 zNear~zFar)을 원근법으로 채우기
  fillGroundQuad(g, xLeft, xRight, zNear, zFar) {
    const a = project(xLeft, zNear);
    const b = project(xRight, zNear);
    const c = project(xRight, zFar);
    const d = project(xLeft, zFar);
    g.fillPoints([a, b, c, d], true);
  }

  // 일정 간격(period m)마다 놓인 폭 width m짜리 줄무늬 중, 화면에 보이는 것만 골라서 cb 호출
  // 줄무늬는 땅에 고정돼 있고, 달린 거리만큼 카메라가 앞으로 가므로 줄무늬가 다가옴
  forEachStripe(period, width, cb) {
    const first = Math.floor((this.distanceMeters + NEAR_Z - width) / period);
    for (let k = first; ; k++) {
      const zA = k * period - this.distanceMeters;
      const zB = zA + width;
      if (zA > FAR_Z) break;
      if (zB <= NEAR_Z) continue;
      cb(Math.max(zA, NEAR_Z), Math.min(zB, FAR_Z));
    }
  }

  // ── 왼쪽 위 기록판 + 오른쪽 위 시계 ─────────────────────────────
  createHud() {
    const box = this.add.graphics().setDepth(20); // 기록판은 캐릭터보다 위에
    box.fillStyle(0x0d1220, 0.55);
    box.fillRoundedRect(16, 16, 250, 132, 14);

    const labelStyle = { fontFamily: 'sans-serif', fontSize: '15px', color: '#b8c2d8' };
    const valueStyle = { fontFamily: 'sans-serif', fontSize: '28px', color: '#ffffff', fontStyle: 'bold' };
    this.hud = {};
    ['시간', '거리', '페이스'].forEach((label, i) => {
      const y = 30 + i * 38;
      this.add.text(32, y + 8, label, labelStyle).setDepth(20);
      this.hud[label] = this.add.text(100, y, '', valueStyle).setDepth(20);
    });

    this.clockText = this.add
      .text(WIDTH - 20, 20, '', {
        fontFamily: 'sans-serif',
        fontSize: '20px',
        color: '#ffffff',
        fontStyle: 'bold',
        backgroundColor: 'rgba(13,18,32,0.55)',
        padding: { x: 12, y: 8 },
      })
      .setOrigin(1, 0)
      .setDepth(20);
  }

  updateHud() {
    // 기록 중일 때만 시간·거리가 올라감 (시작 전에는 0)
    const stats = this.registry.get('runStats');
    this.hud['시간'].setText(formatDuration((stats?.elapsedMs ?? 0) / 1000));
    this.hud['거리'].setText(formatDistance(stats?.distanceM ?? 0));
    this.hud['페이스'].setText(`${formatPace(this.currentSpeedKmh)} /km`);

    const now = new Date();
    const hh = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');
    this.clockText.setText(`${this.theme.icon} ${hh}:${mm}`);
  }
}
