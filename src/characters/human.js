// 사람 캐릭터 (뒷모습). 머리 모양·머리 위·상의·하의·소품·색깔을 고를 수 있음
//
// 뒤에서 보면 달리기 동작은 이렇게 보임:
//  - 뒤로 차올리는 다리: 발이 위로 올라오면서 신발 밑창이 보임
//  - 앞으로 나간 다리: 멀어지니까 발이 살짝 높아 보임
//  - 팔: 뒤로 흔들 때는 손이 옆으로 보이고, 앞으로 흔들 때는 몸에 가려 짧아 보임

import Phaser from 'phaser';
import { HIP_Y, HEAD_Y, HEAD_R, outline, shade, mix, legPose, armPose, limbSegment } from './common.js';

// 고른 색깔로 그늘·광택 색까지 계산
function colorsFor(look) {
  return {
    skin: look.skinColor,
    skinShade: shade(look.skinColor, 0.92),
    hair: look.hairColor,
    hairDark: shade(look.hairColor, 0.6),
    hairLight: mix(look.hairColor, 0xffffff, 0.4),
    top: look.topColor,
    topShade: shade(look.topColor, 0.85),
    bottom: look.bottomColor,
    shoe: look.shoeColor,
    accent: look.accentColor,
  };
}

export function makeHuman(scene, look) {
  const c = colorsFor(look);
  const has = (a) => look.accessories.includes(a);
  const longSleeves = look.top === 'longsleeve' || look.top === 'windbreaker';

  const torso = scene.add.graphics();
  drawTorso(torso, look, c);
  const parts = [torso];

  // 배낭을 메면 등번호가 가려짐
  if (has('backpack')) {
    const pack = scene.add.graphics();
    drawBackpack(pack, c);
    parts.push(pack);
  } else if (look.number) {
    parts.push(
      scene.add
        .text(0, -130, look.number, { fontFamily: 'sans-serif', fontSize: '19px', color: '#2a2f4f', fontStyle: 'bold' })
        .setOrigin(0.5)
    );
  }

  const head = scene.add.graphics();
  drawHead(head, look, c);
  parts.push(head);

  // 머리띠 끈 (매듭 위치를 기준으로 펄럭임)
  let bandTail = null;
  if (look.headgear === 'band') {
    bandTail = scene.add.graphics({ x: 15, y: HEAD_Y - 8 });
    bandTail.fillStyle(c.accent);
    bandTail.fillTriangle(0, -2, 22, 18, 26, 10);
    bandTail.fillTriangle(0, 2, 12, 26, 18, 24);
    parts.push(bandTail);
  }

  // 포니테일 (정수리 뒤쪽을 기준으로 흔들림)
  let ponytail = null;
  if (look.hairStyle === 'ponytail') {
    ponytail = scene.add.graphics({ x: 0, y: HEAD_Y - 6 });
    drawPonytail(ponytail, c);
    parts.push(ponytail);
  }

  return {
    parts,
    drawLimbs(g, swing, amount, leftKick, rightKick) {
      // 팔: 같은 쪽 다리와 반대로 (왼다리가 뒤면 왼팔은 앞)
      drawArm(g, look, c, -1, -swing * amount, longSleeves, has('watch'));
      drawArm(g, look, c, 1, swing * amount, longSleeves, false);
      drawLeg(g, look, c, -12, leftKick, rightKick);
      drawLeg(g, look, c, 12, rightKick, leftKick);
    },
    animate({ swing, amount, timeSec, speedKmh, phase }) {
      if (bandTail) bandTail.rotation = Math.sin(timeSec * (5 + speedKmh * 0.8)) * (0.06 + 0.25 * amount);
      if (ponytail) {
        // 몸 흔들림 반대로 찰랑 + 착지할 때 살짝 튀어오름
        ponytail.rotation = -swing * 0.35 * amount + Math.sin(timeSec * 2) * 0.04;
        ponytail.scaleY = 1 - 0.12 * amount * Math.abs(Math.sin(phase));
      }
    },
  };
}

// ── 몸통 ───────────────────────────────────────────────────────
function drawTorso(g, look, c) {
  // 하의 (반바지 또는 레깅스 윗부분)
  g.fillStyle(c.bottom);
  g.fillRoundedRect(-26, -102, 52, 30, 9);
  outline(g);
  g.strokeRoundedRect(-26, -102, 52, 30, 9);
  g.fillStyle(c.accent);
  g.fillRect(-26, -96, 4, 22); // 옆선
  g.fillRect(22, -96, 4, 22);
  g.fillStyle(0xffffff, 0.5);
  g.fillRect(-1, -100, 2, 10); // 가운데 봉제선

  // 목
  g.fillStyle(c.skinShade);
  g.fillRect(-8, -166, 16, 14);

  if (look.top === 'tank') {
    // 민소매: 어깨 피부가 보이고, 끈 두 개
    g.fillStyle(c.skin);
    g.fillRoundedRect(-29, -160, 58, 22, 14);
    g.fillStyle(c.top);
    g.fillRoundedRect(-25, -150, 50, 56, 12);
    g.fillRect(-18, -162, 10, 14); // 끈
    g.fillRect(8, -162, 10, 14);
    g.fillStyle(c.topShade);
    g.fillRoundedRect(10, -148, 14, 52, { tl: 0, tr: 10, bl: 0, br: 10 });
    g.fillStyle(c.accent);
    g.fillRect(-25, -140, 4, 40);
    g.fillRect(21, -140, 4, 40);
    outline(g);
    g.strokeRoundedRect(-25, -150, 50, 56, 12);
  } else {
    const wide = look.top === 'windbreaker' ? 3 : 0; // 바람막이는 조금 더 헐렁하게
    g.fillStyle(c.top);
    g.fillRoundedRect(-29 - wide, -160, 58 + wide * 2, 66 + wide * 2, 16);
    g.fillStyle(c.topShade);
    g.fillRoundedRect(12 + wide, -158, 16, 62 + wide, { tl: 0, tr: 14, bl: 0, br: 14 }); // 오른쪽 그늘
    g.fillStyle(0xffffff, 0.18);
    g.fillRoundedRect(-25 - wide, -156, 14, 30, 8); // 왼쪽 어깨 하이라이트
    if (look.top === 'windbreaker') {
      // 반사띠 + 접힌 후드 + 밑단 밴드
      g.fillStyle(0xe8edf5, 0.9);
      g.fillRect(-32, -112, 64, 5);
      g.fillStyle(c.topShade);
      g.fillRoundedRect(-17, -170, 34, 16, 8);
      g.fillStyle(shade(c.top, 0.7));
      g.fillRoundedRect(-32, -95, 64, 6, 3);
    } else {
      g.fillStyle(c.accent);
      g.fillRect(-29, -146, 5, 46); // 옆선
      g.fillRect(24, -146, 5, 46);
      g.fillRoundedRect(-12, -163, 24, 7, 3); // 뒷 칼라
    }
    outline(g);
    g.strokeRoundedRect(-29 - wide, -160, 58 + wide * 2, 66 + wide * 2, 16);
  }

  if (look.accessories.includes('backpack') || !look.number) return;
  // 등번호판 + 핀 4개
  g.fillStyle(0xffffff);
  g.fillRoundedRect(-17, -143, 34, 26, 4);
  g.lineStyle(1.5, 0x2a2f4f, 0.3);
  g.strokeRoundedRect(-17, -143, 34, 26, 4);
  g.fillStyle(0xb7bccb);
  for (const [px, py] of [[-13, -139], [13, -139], [-13, -121], [13, -121]]) g.fillCircle(px, py, 1.6);
}

// 러닝 배낭(조끼형): 어깨끈 + 가방 + 물병
function drawBackpack(g, c) {
  const bag = 0x2b2f3a;
  g.fillStyle(bag);
  g.fillRect(-22, -160, 8, 20); // 어깨끈
  g.fillRect(14, -160, 8, 20);
  g.fillRoundedRect(-21, -150, 42, 46, 10);
  g.fillStyle(0x3a4050);
  g.fillRoundedRect(-15, -132, 30, 22, 6); // 앞주머니
  g.fillStyle(c.accent);
  g.fillRect(-15, -134, 30, 3); // 지퍼
  g.fillStyle(0x9fd8ff, 0.9);
  g.fillRoundedRect(-27, -142, 8, 20, 3); // 옆 물병
  outline(g);
  g.strokeRoundedRect(-21, -150, 42, 46, 10);
}

// ── 머리 ───────────────────────────────────────────────────────
function drawHead(g, look, c) {
  const bob = look.hairStyle === 'bob';

  // 귀 (단발이면 머리카락에 가려짐)
  if (!bob) {
    for (const side of [-1, 1]) {
      g.fillStyle(c.skin);
      g.fillCircle(side * 26, HEAD_Y + 4, 7);
      outline(g);
      g.strokeCircle(side * 26, HEAD_Y + 4, 7);
      g.fillStyle(0xffa8a8, 0.6);
      g.fillCircle(side * 27, HEAD_Y + 4, 3);
    }
  }

  // 머리카락
  g.fillStyle(c.hair);
  g.fillCircle(0, HEAD_Y, HEAD_R);
  if (bob) {
    // 단발: 귀를 덮고 목덜미까지 내려오는 일자 끝
    g.fillRoundedRect(-HEAD_R - 3, HEAD_Y - 4, HEAD_R * 2 + 6, 34, { tl: 0, tr: 0, bl: 8, br: 8 });
    outline(g);
    g.strokeRoundedRect(-HEAD_R - 3, HEAD_Y - 4, HEAD_R * 2 + 6, 34, { tl: 0, tr: 0, bl: 8, br: 8 });
    g.fillStyle(c.hair);
    g.fillCircle(0, HEAD_Y, HEAD_R - 1.5); // 위쪽 외곽선 지우기
  } else {
    for (const x of [-15, -5, 5, 15]) g.fillCircle(x, HEAD_Y + 20, 9); // 물결 모양 뒷머리 끝
    outline(g);
    g.strokeCircle(0, HEAD_Y, HEAD_R);
  }

  // 머리카락 결
  g.lineStyle(2, c.hairDark, 0.6);
  g.lineBetween(-8, HEAD_Y - 4, -11, HEAD_Y + (bob ? 26 : 18));
  g.lineBetween(7, HEAD_Y - 4, 10, HEAD_Y + (bob ? 26 : 18));

  // 광택 (반짝이는 띠)
  g.lineStyle(4, c.hairLight, 0.85);
  g.beginPath();
  g.arc(0, HEAD_Y, HEAD_R - 7, Phaser.Math.DegToRad(200), Phaser.Math.DegToRad(245));
  g.strokePath();

  // 이어폰 (귀 위치에 작은 무선 이어폰)
  if (look.accessories.includes('earphones')) {
    for (const side of [-1, 1]) {
      g.fillStyle(0xffffff);
      g.fillCircle(side * (bob ? 29 : 27), HEAD_Y + 5, 5);
      g.fillRoundedRect(side * (bob ? 29 : 27) - 2, HEAD_Y + 6, 4, 10, 2);
      outline(g);
      g.strokeCircle(side * (bob ? 29 : 27), HEAD_Y + 5, 5);
    }
  }

  if (look.headgear === 'band') {
    // 머리띠 + 매듭
    g.fillStyle(c.accent);
    g.fillRoundedRect(-HEAD_R + 1, HEAD_Y - 13, HEAD_R * 2 - 2, 10, 4);
    g.fillStyle(0xffffff, 0.35);
    g.fillRect(-HEAD_R + 4, HEAD_Y - 11, HEAD_R * 2 - 8, 2);
    g.fillStyle(c.accent);
    g.fillCircle(15, HEAD_Y - 8, 6);
  } else if (look.headgear === 'cap') {
    // 야구 모자 뒷모습: 둥근 윗부분 + 뒤쪽 구멍 + 조절 끈 + 옆으로 살짝 보이는 챙
    const capColor = c.top;
    g.fillStyle(shade(capColor, 0.8));
    g.fillEllipse(0, HEAD_Y - 6, HEAD_R * 2 + 14, 10); // 챙 끝
    g.fillStyle(capColor);
    g.beginPath();
    g.arc(0, HEAD_Y - 4, HEAD_R + 2, Math.PI, 0);
    g.closePath();
    g.fillPath();
    outline(g);
    g.beginPath();
    g.arc(0, HEAD_Y - 4, HEAD_R + 2, Math.PI, 0);
    g.closePath();
    g.strokePath();
    g.lineStyle(1.5, shade(capColor, 0.7), 0.8);
    g.lineBetween(0, HEAD_Y - HEAD_R - 6, 0, HEAD_Y - 4); // 봉제선
    g.fillStyle(c.hair);
    g.fillEllipse(0, HEAD_Y - 6, 18, 12); // 뒤쪽 구멍으로 보이는 머리
    g.fillStyle(c.accent);
    g.fillRoundedRect(-10, HEAD_Y - 6, 20, 4, 2); // 조절 끈
    g.fillStyle(c.accent);
    g.fillCircle(0, HEAD_Y - HEAD_R - 5, 3); // 꼭지 단추
  }
}

function drawPonytail(g, c) {
  g.fillStyle(c.hair);
  g.fillEllipse(0, 24, 20, 38);
  g.fillEllipse(0, 44, 12, 14); // 끝부분
  outline(g);
  g.strokeEllipse(0, 24, 20, 38);
  g.lineStyle(2, c.hairDark, 0.5);
  g.lineBetween(-2, 10, -3, 40);
  g.lineStyle(3, c.hairLight, 0.7);
  g.lineBetween(-5, 12, -6, 26);
  g.fillStyle(c.accent);
  g.fillRoundedRect(-8, 3, 16, 6, 3); // 머리끈
}

// ── 다리 ───────────────────────────────────────────────────────
function drawLeg(g, look, c, x, kick, reach) {
  const { kneeY, footY, footX } = legPose(x, kick, reach);
  const leggings = look.bottom === 'leggings';
  const thighColor = leggings ? c.bottom : c.skin;
  const shinColor = leggings ? shade(c.bottom, kick > 0.4 ? 0.85 : 1) : kick > 0.4 ? c.skinShade : c.skin;

  // 허벅지
  g.fillStyle(thighColor);
  g.fillRoundedRect(x - 8, HIP_Y + 8, 16, kneeY - HIP_Y, 7);
  outline(g);
  g.strokeRoundedRect(x - 8, HIP_Y + 8, 16, kneeY - HIP_Y, 7);

  // 정강이 (차올리면 무릎보다 발이 위로 올라오기도 함)
  const shinTop = Math.min(kneeY, footY - 14) - 4;
  const shinHeight = Math.abs(kneeY - (footY - 14)) + 8;
  g.fillStyle(shinColor);
  g.fillRoundedRect(footX - 7, shinTop, 14, shinHeight, 6);
  outline(g);
  g.strokeRoundedRect(footX - 7, shinTop, 14, shinHeight, 6);
  if (leggings) {
    g.fillStyle(c.accent, 0.8);
    g.fillRect(footX + (x < 0 ? -7 : 5), shinTop + 4, 2, shinHeight - 8); // 레깅스 옆선
  }

  // 양말
  g.fillStyle(0xffffff);
  g.fillRect(footX - 7, footY - 22, 14, 8);
  g.fillStyle(c.accent);
  g.fillRect(footX - 7, footY - 21, 14, 2);

  // 운동화 뒤꿈치. 차올릴수록 밑창이 크게 보임
  g.fillStyle(c.shoe);
  g.fillRoundedRect(footX - 11, footY - 16, 22, 16, 6);
  g.fillStyle(c.shoe === 0xffffff ? c.top : 0xffffff);
  g.fillRoundedRect(footX - 4, footY - 16, 8, 9, 3); // 뒤꿈치 탭
  g.fillStyle(c.accent);
  g.fillRoundedRect(footX - 11, footY - 4 - kick * 8, 22, 4 + kick * 12, 3);
  outline(g);
  g.strokeRoundedRect(footX - 11, footY - 16, 22, 16, 6);
}

// ── 팔 ─────────────────────────────────────────────────────────
function drawArm(g, look, c, side, back, longSleeves, watch) {
  const { b, shoulder, elbow, hand } = armPose(side, back, look.top === 'windbreaker' ? 2 : 0);
  const sleeve = longSleeves ? c.top : c.skin;
  const width = look.top === 'windbreaker' ? 14 : 12;

  limbSegment(g, shoulder, elbow, width, sleeve);
  limbSegment(g, elbow, hand, width, sleeve);
  g.fillStyle(sleeve);
  g.fillCircle(elbow.x, elbow.y, width / 2);
  g.lineStyle(width, sleeve);
  g.lineBetween(shoulder.x, shoulder.y, elbow.x, elbow.y); // 팔꿈치 이음새의 외곽선 지우기

  // 긴소매 끝 (손목 밴드)
  if (longSleeves) {
    const cuff = { x: hand.x + (elbow.x - hand.x) * 0.22, y: hand.y + (elbow.y - hand.y) * 0.22 };
    g.fillStyle(shade(c.top, 0.75));
    g.fillCircle(cuff.x, cuff.y, width / 2 + 0.5);
  }

  // 시계 (손목)
  if (watch) {
    const w = { x: hand.x + (elbow.x - hand.x) * 0.3, y: hand.y + (elbow.y - hand.y) * 0.3 };
    g.fillStyle(0x1d2333);
    g.fillRoundedRect(w.x - 7, w.y - 5, 14, 10, 3);
    g.fillStyle(0x5ee6ff);
    g.fillRoundedRect(w.x - 4, w.y - 3, 8, 6, 2);
  }

  // 주먹 (뒤로 온 손은 카메라에 가까워서 조금 크게)
  const r = 7 + 2 * b;
  g.fillStyle(c.skin);
  g.fillCircle(hand.x, hand.y, r);
  outline(g);
  g.strokeCircle(hand.x, hand.y, r);

  // 반팔 소매
  if (look.top === 'tshirt') {
    g.fillStyle(c.top);
    g.fillCircle(shoulder.x, shoulder.y + 2, 12);
    g.fillStyle(c.accent);
    g.fillRect(shoulder.x - 9, shoulder.y + 10, 18, 3);
  } else if (longSleeves) {
    g.fillStyle(c.top);
    g.fillCircle(shoulder.x, shoulder.y + 2, width / 2 + 5);
  }
}
