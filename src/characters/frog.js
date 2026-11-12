// 오리지널 캐릭터: 개구리 러너 "퐁"
// 넓적한 머리 위에 동그란 눈 두 개(뒤에서 보면 혹처럼 보임), 등에 점무늬, 물갈퀴 발.
// 달릴 때 눈이 통통 튐.

import { HIP_Y, HEAD_Y, outline, legPose, armPose, limbSegment } from './common.js';

const GREEN = 0x5cc46a;
const GREEN_SHADE = 0x48a956;
const SPOT = 0x3a8c48;
const FOOT = 0x9ad66b; // 물갈퀴 발
const CHEEK = 0xffa8a8;

export function makeFrog(scene, look) {
  const body = scene.add.graphics();
  drawBody(body);

  const parts = [body];
  // 작은 등번호 (조끼처럼 매달린 번호판)
  if (look.number) {
    const bib = scene.add.graphics();
    bib.fillStyle(0xffffff);
    bib.fillRoundedRect(-14, -128, 28, 20, 4);
    bib.lineStyle(1.5, 0x2a2f4f, 0.3);
    bib.strokeRoundedRect(-14, -128, 28, 20, 4);
    parts.push(
      bib,
      scene.add
        .text(0, -118, look.number, { fontFamily: 'sans-serif', fontSize: '15px', color: '#2a2f4f', fontStyle: 'bold' })
        .setOrigin(0.5)
    );
  }

  const head = scene.add.graphics();
  drawHead(head);
  parts.push(head);

  // 눈 두 개 (머리 위에 따로 붙어서 통통 튐)
  const eyes = [-17, 17].map((x) => {
    const e = scene.add.graphics({ x, y: HEAD_Y - 14 });
    e.fillStyle(GREEN);
    e.fillCircle(0, -8, 14);
    outline(e);
    e.strokeCircle(0, -8, 14);
    e.fillStyle(0xffffff, 0.35);
    e.fillCircle(-4, -13, 4); // 반짝임
    return e;
  });
  parts.push(...eyes);

  return {
    parts,
    drawLimbs(g, swing, amount, leftKick, rightKick) {
      drawArm(g, -1, -swing * amount);
      drawArm(g, 1, swing * amount);
      drawLeg(g, -15, leftKick, rightKick);
      drawLeg(g, 15, rightKick, leftKick);
    },
    animate({ amount, phase, timeSec }) {
      // 착지할 때마다 눈이 살짝 눌렸다가 튀어오름
      const squash = Math.abs(Math.sin(phase)) * amount;
      eyes.forEach((e, i) => {
        e.scaleY = 1 - 0.15 * squash + 0.03 * Math.sin(timeSec * 2 + i);
        e.scaleX = 1 + 0.08 * squash;
        e.y = HEAD_Y - 14 - 4 * squash;
      });
    },
  };
}

function drawBody(g) {
  // 통통한 몸 (아래가 넓은 배 모양)
  g.fillStyle(GREEN);
  g.fillEllipse(0, -122, 66, 84);
  g.fillStyle(GREEN_SHADE);
  g.fillEllipse(16, -120, 24, 70);
  outline(g);
  g.strokeEllipse(0, -122, 66, 84);
  // 등 점무늬
  g.fillStyle(SPOT);
  for (const [x, y, r] of [[-14, -146, 5], [10, -152, 4], [-6, -102, 4], [18, -108, 3], [-22, -118, 3]]) {
    g.fillCircle(x, y, r);
  }
}

function drawHead(g) {
  // 넓적한 머리
  g.fillStyle(GREEN);
  g.fillEllipse(0, HEAD_Y + 4, 82, 56);
  g.fillStyle(GREEN_SHADE);
  g.fillEllipse(22, HEAD_Y + 8, 26, 40);
  outline(g);
  g.strokeEllipse(0, HEAD_Y + 4, 82, 56);
  // 옆으로 살짝 보이는 볼
  g.fillStyle(CHEEK, 0.7);
  g.fillCircle(-36, HEAD_Y + 12, 5);
  g.fillCircle(36, HEAD_Y + 12, 5);
  // 뒤통수 점
  g.fillStyle(SPOT);
  g.fillCircle(-8, HEAD_Y + 10, 4);
  g.fillCircle(10, HEAD_Y + 2, 3);
}

function drawLeg(g, x, kick, reach) {
  const { kneeY, footY, footX } = legPose(x, kick, reach);

  // 굵은 허벅지
  g.fillStyle(GREEN);
  g.fillRoundedRect(x - 10, HIP_Y + 4, 20, kneeY - HIP_Y + 4, 9);
  outline(g);
  g.strokeRoundedRect(x - 10, HIP_Y + 4, 20, kneeY - HIP_Y + 4, 9);

  // 정강이
  const shinTop = Math.min(kneeY, footY - 10) - 4;
  const shinHeight = Math.abs(kneeY - (footY - 10)) + 8;
  g.fillStyle(kick > 0.4 ? GREEN_SHADE : GREEN);
  g.fillRoundedRect(footX - 7, shinTop, 14, shinHeight, 6);
  outline(g);
  g.strokeRoundedRect(footX - 7, shinTop, 14, shinHeight, 6);

  // 물갈퀴 발 (차올리면 발바닥이 넓게 보임)
  const spread = 14 + kick * 6;
  const fy = footY - 6;
  g.fillStyle(FOOT);
  g.fillTriangle(footX - spread, fy + 4 + kick * 6, footX + spread, fy + 4 + kick * 6, footX, fy - 8);
  for (const dx of [-spread, 0, spread]) g.fillCircle(footX + dx, fy + 4 + kick * 6, 4); // 발가락 끝
  outline(g);
  g.strokeTriangle(footX - spread, fy + 4 + kick * 6, footX + spread, fy + 4 + kick * 6, footX, fy - 8);
}

function drawArm(g, side, back) {
  const { b, shoulder, elbow, hand } = armPose(side, back, 2);
  limbSegment(g, shoulder, elbow, 10, GREEN);
  limbSegment(g, elbow, hand, 10, GREEN);
  g.fillStyle(GREEN);
  g.fillCircle(elbow.x, elbow.y, 5);
  // 손가락 3개
  const r = 4 + b;
  g.fillStyle(FOOT);
  for (const dx of [-5, 0, 5]) g.fillCircle(hand.x + dx, hand.y + (dx === 0 ? -2 : 0), r);
}
