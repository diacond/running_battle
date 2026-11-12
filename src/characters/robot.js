// 오리지널 캐릭터: 러닝 로봇 "R-7"
// 둥근 네모 머리 + 안테나, 등에 추진기 2개. 빨리 달릴수록 추진기 불꽃이 커짐.

import { HIP_Y, HEAD_Y, outline, legPose, armPose, limbSegment } from './common.js';

const METAL = 0xd7dde6; // 은색 몸체
const METAL_SHADE = 0xaeb7c4;
const JOINT = 0x4a5568; // 관절 (진한 회색)
const GLOW = 0x3ef2d0; // 빛나는 부분 (청록)
const POINT = 0xff8a3d; // 포인트 (주황)

export function makeRobot(scene, look) {
  const body = scene.add.graphics();
  drawBody(body);

  // 등번호는 몸통 판에 표시
  const parts = [body];
  if (look.number) {
    parts.push(
      scene.add
        .text(0, -128, look.number, { fontFamily: 'monospace', fontSize: '16px', color: '#3ef2d0', fontStyle: 'bold' })
        .setOrigin(0.5)
    );
  }

  // 추진기 불꽃 (속도에 따라 크기가 바뀜)
  const flames = [-16, 16].map((x) => {
    const f = scene.add.graphics({ x, y: -99 });
    f.fillStyle(0xffd27a, 0.9);
    f.fillTriangle(-8, 0, 8, 0, 0, 34);
    f.fillStyle(0xffffff, 0.9);
    f.fillTriangle(-3, 0, 3, 0, 0, 14);
    return f;
  });

  const head = scene.add.graphics();
  drawHead(head);

  // 안테나 (머리 위 기준으로 흔들림)
  const antenna = scene.add.graphics({ x: 8, y: HEAD_Y - 24 });
  antenna.lineStyle(3, JOINT);
  antenna.lineBetween(0, 0, 0, -18);
  antenna.fillStyle(GLOW);
  antenna.fillCircle(0, -20, 5);

  parts.push(...flames, head, antenna); // 불꽃은 몸통 위에 그려서 허리에 가려지지 않게

  return {
    parts,
    drawLimbs(g, swing, amount, leftKick, rightKick) {
      drawArm(g, -1, -swing * amount);
      drawArm(g, 1, swing * amount);
      drawLeg(g, -13, leftKick, rightKick);
      drawLeg(g, 13, rightKick, leftKick);
    },
    animate({ amount, timeSec, speedKmh, swing }) {
      const flicker = 0.85 + 0.15 * Math.sin(timeSec * 40);
      for (const f of flames) {
        f.setVisible(amount > 0.05);
        f.scaleY = (0.3 + amount * (0.5 + speedKmh / 20)) * flicker;
        f.scaleX = 0.7 + 0.3 * amount;
      }
      antenna.rotation = -swing * 0.25 * amount + Math.sin(timeSec * 3) * 0.05;
    },
  };
}

function drawBody(g) {
  // 허리 (관절 박스)
  g.fillStyle(JOINT);
  g.fillRoundedRect(-24, -104, 48, 24, 6);
  outline(g);
  g.strokeRoundedRect(-24, -104, 48, 24, 6);

  // 목
  g.fillStyle(JOINT);
  g.fillRect(-7, -168, 14, 12);

  // 몸통 (위가 넓은 상자)
  g.fillStyle(METAL);
  g.fillRoundedRect(-32, -162, 64, 62, 10);
  g.fillStyle(METAL_SHADE);
  g.fillRoundedRect(14, -160, 16, 58, { tl: 0, tr: 8, bl: 0, br: 8 });
  outline(g);
  g.strokeRoundedRect(-32, -162, 64, 62, 10);

  // 등 판 + 번호 창
  g.fillStyle(0x2b3240);
  g.fillRoundedRect(-16, -140, 32, 22, 4);

  // 추진기 2개
  for (const x of [-16, 16]) {
    g.fillStyle(JOINT);
    g.fillRoundedRect(x - 9, -116, 18, 18, 4);
    g.fillStyle(POINT);
    g.fillRect(x - 9, -112, 18, 3);
    outline(g);
    g.strokeRoundedRect(x - 9, -116, 18, 18, 4);
  }

  // 어깨 보호대
  for (const side of [-1, 1]) {
    g.fillStyle(POINT);
    g.fillRoundedRect(side * 30 - 11, -164, 22, 18, 7);
    outline(g);
    g.strokeRoundedRect(side * 30 - 11, -164, 22, 18, 7);
  }

  // 환기구 줄
  g.lineStyle(2, METAL_SHADE);
  for (const y of [-154, -149]) g.lineBetween(-12, y, 12, y);
}

function drawHead(g) {
  // 귀 센서
  for (const side of [-1, 1]) {
    g.fillStyle(JOINT);
    g.fillCircle(side * 26, HEAD_Y, 8);
    g.fillStyle(GLOW);
    g.fillCircle(side * 27, HEAD_Y, 3);
  }
  g.fillStyle(METAL);
  g.fillRoundedRect(-24, HEAD_Y - 24, 48, 44, 12);
  g.fillStyle(METAL_SHADE);
  g.fillRoundedRect(8, HEAD_Y - 22, 14, 40, { tl: 0, tr: 10, bl: 0, br: 10 });
  outline(g);
  g.strokeRoundedRect(-24, HEAD_Y - 24, 48, 44, 12);
  // 뒤통수 패널과 나사
  g.lineStyle(2, METAL_SHADE);
  g.strokeRoundedRect(-14, HEAD_Y - 12, 28, 22, 4);
  g.fillStyle(JOINT);
  for (const [x, y] of [[-10, -8], [10, -8], [-10, 6], [10, 6]]) g.fillCircle(x, HEAD_Y + y, 1.8);
}

function drawLeg(g, x, kick, reach) {
  const { kneeY, footY, footX } = legPose(x, kick, reach);

  // 허벅지 (관절색 기둥)
  g.fillStyle(JOINT);
  g.fillRoundedRect(x - 6, HIP_Y + 6, 12, kneeY - HIP_Y, 4);
  // 무릎
  g.fillStyle(POINT);
  g.fillCircle(x, kneeY, 7);
  // 정강이 (은색 장갑)
  const shinTop = Math.min(kneeY, footY - 14) - 2;
  const shinHeight = Math.abs(kneeY - (footY - 14)) + 6;
  g.fillStyle(kick > 0.4 ? METAL_SHADE : METAL);
  g.fillRoundedRect(footX - 9, shinTop, 18, shinHeight, 5);
  outline(g);
  g.strokeRoundedRect(footX - 9, shinTop, 18, shinHeight, 5);

  // 발 (네모 블록 + 주황 밑창)
  g.fillStyle(JOINT);
  g.fillRoundedRect(footX - 12, footY - 16, 24, 16, 4);
  g.fillStyle(POINT);
  g.fillRoundedRect(footX - 12, footY - 4 - kick * 8, 24, 4 + kick * 12, 2);
  outline(g);
  g.strokeRoundedRect(footX - 12, footY - 16, 24, 16, 4);
}

function drawArm(g, side, back) {
  const { b, shoulder, elbow, hand } = armPose(side, back, 4);
  limbSegment(g, shoulder, elbow, 10, JOINT);
  limbSegment(g, elbow, hand, 13, METAL);
  g.fillStyle(POINT);
  g.fillCircle(elbow.x, elbow.y, 6);
  // 손 (네모 주먹)
  const r = 8 + 2 * b;
  g.fillStyle(JOINT);
  g.fillRoundedRect(hand.x - r, hand.y - r, r * 2, r * 2, 4);
  outline(g);
  g.strokeRoundedRect(hand.x - r, hand.y - r, r * 2, r * 2, 4);
}
