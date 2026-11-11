// 오리지널 캐릭터 뒷모습: 머리띠 + 포니테일 꼬마 러너
// 카메라가 뒤에서 따라가므로 뒷모습을 그림.
//
// 뒤에서 보면 달리기 동작은 이렇게 보임:
//  - 뒤로 차올리는 다리: 발이 위로 올라오면서 신발 밑창이 보임
//  - 앞으로 나간 다리: 멀어지니까 발이 살짝 높아 보임
//  - 팔: 뒤로 흔들 때는 손이 옆으로 보이고, 앞으로 흔들 때는 몸에 가려 짧아 보임
//
// 좌표: 발바닥이 y=0, 위로 갈수록 y가 작아짐(음수). 키는 약 205픽셀.

import Phaser from 'phaser';
import { DEFAULT_SKIN } from './skins.js';

const HIP_Y = -92;
const KNEE_Y = -46;
const SHOULDER_Y = -146;
const HEAD_Y = -180;
const HEAD_R = 27;
const OUTLINE = { width: 2.5, color: 0x2b2340, alpha: 0.55 }; // 만화풍 외곽선

export class Runner {
  // skin: 외형 정보(색깔, 머리 모양 등). 나중에 사진으로 만든 아바타도 이 형태로 넣으면 됨
  constructor(scene, x, groundY, skin = DEFAULT_SKIN) {
    this.skin = skin;
    this.phase = 0; // 달리기 동작이 한 바퀴 중 어디쯤인지 (0 ~ 2π)

    this.root = scene.add.container(x, groundY);
    this.shadow = scene.add.ellipse(0, 0, 100, 20, 0x000000, 0.28);

    // body: 통통 튀고 좌우로 살짝 흔들리는 부분 (그림자는 땅에 그대로)
    this.body = scene.add.container(0, 0);
    this.limbs = scene.add.graphics(); // 팔다리는 모양이 계속 바뀌어서 매 프레임 다시 그림

    const torso = scene.add.graphics();
    drawTorso(torso, skin);
    const bib = scene.add
      .text(0, -130, skin.number, { fontFamily: 'sans-serif', fontSize: '19px', color: '#2a2f4f', fontStyle: 'bold' })
      .setOrigin(0.5);

    const head = scene.add.graphics();
    drawHead(head, skin);

    // 머리띠 끈 (매듭 위치를 기준으로 펄럭임)
    this.bandTail = scene.add.graphics({ x: 15, y: HEAD_Y - 8 });
    this.bandTail.fillStyle(skin.band);
    this.bandTail.fillTriangle(0, -2, 22, 18, 26, 10);
    this.bandTail.fillTriangle(0, 2, 12, 26, 18, 24);

    // 포니테일 (정수리 뒤쪽을 기준으로 흔들림)
    this.ponytail = null;
    if (skin.hairStyle === 'ponytail') {
      this.ponytail = scene.add.graphics({ x: 0, y: HEAD_Y - 6 });
      drawPonytail(this.ponytail, skin);
    }

    const parts = [this.limbs, torso, bib, head, this.bandTail];
    if (this.ponytail) parts.push(this.ponytail);
    this.body.add(parts);
    this.root.add([this.shadow, this.body]);
  }

  // 매 프레임 호출. speedKmh: 현재 속도, dt: 흐른 시간(초), timeSec: 전체 시간(초)
  update(speedKmh, dt, timeSec) {
    // 동작 크기: 0 km/h면 0(가만히 서 있음), 8 km/h 이상이면 1(최대)
    const amount = Math.min(speedKmh / 8, 1);

    // 1초에 다리를 몇 번 휘두를지. 10 km/h ≈ 1.45회/초 (≈ 분당 174걸음)
    const cyclesPerSec = speedKmh > 0 ? 0.8 + speedKmh * 0.065 : 0;
    this.phase = (this.phase + cyclesPerSec * Math.PI * 2 * dt) % (Math.PI * 2);
    const swing = Math.sin(this.phase); // +면 왼다리가 뒤로, -면 오른다리가 뒤로

    // 다리: 뒤로 간 다리는 차올리고(kick), 앞으로 간 다리는 살짝 멀어짐(reach)
    const leftKick = Math.max(0, swing) * amount;
    const rightKick = Math.max(0, -swing) * amount;

    const g = this.limbs;
    g.clear();
    // 팔: 같은 쪽 다리와 반대로 (왼다리가 뒤면 왼팔은 앞)
    drawArm(g, this.skin, -1, -swing * amount);
    drawArm(g, this.skin, 1, swing * amount);
    drawLeg(g, this.skin, -12, leftKick, rightKick);
    drawLeg(g, this.skin, 12, rightKick, leftKick);

    // 몸 통통 튀기 + 좌우 흔들림 + 멈춰 있을 때 숨쉬기
    const bounce = 8 * amount * Math.abs(Math.cos(this.phase));
    const breathe = (1 - amount) * 1.5 * Math.sin(timeSec * 3);
    this.body.y = -bounce - breathe;
    this.body.x = swing * 3 * amount;
    this.body.rotation = swing * 0.03 * amount;
    this.shadow.scaleX = 1 - bounce * 0.02;

    // 머리띠 끈 펄럭이기
    this.bandTail.rotation = Math.sin(timeSec * (5 + speedKmh * 0.8)) * (0.06 + 0.25 * amount);

    // 포니테일: 몸 흔들림 반대로 찰랑 + 착지할 때 살짝 튀어오름
    if (this.ponytail) {
      this.ponytail.rotation = -swing * 0.35 * amount + Math.sin(timeSec * 2) * 0.04;
      this.ponytail.scaleY = 1 - 0.12 * amount * Math.abs(Math.sin(this.phase));
    }
  }
}

function outline(g) {
  g.lineStyle(OUTLINE.width, OUTLINE.color, OUTLINE.alpha);
}

// 몸통: 반바지 + 유니폼 + 등번호판
function drawTorso(g, skin) {
  // 반바지
  g.fillStyle(skin.shorts);
  g.fillRoundedRect(-26, -102, 52, 30, 9);
  outline(g);
  g.strokeRoundedRect(-26, -102, 52, 30, 9);
  g.fillStyle(skin.accent);
  g.fillRect(-26, -96, 4, 22); // 옆선
  g.fillRect(22, -96, 4, 22);
  g.fillStyle(0xffffff, 0.8);
  g.fillRect(-1, -100, 2, 10); // 가운데 봉제선

  // 목
  g.fillStyle(skin.skinShade);
  g.fillRect(-8, -166, 16, 14);

  // 유니폼
  g.fillStyle(skin.shirt);
  g.fillRoundedRect(-29, -160, 58, 66, 16);
  g.fillStyle(skin.shirtShade);
  g.fillRoundedRect(12, -158, 16, 62, { tl: 0, tr: 14, bl: 0, br: 14 }); // 오른쪽 그늘
  g.fillStyle(0xffffff, 0.18);
  g.fillRoundedRect(-25, -156, 14, 30, 8); // 왼쪽 어깨 하이라이트
  g.fillStyle(skin.accent);
  g.fillRect(-29, -146, 5, 46); // 옆선
  g.fillRect(24, -146, 5, 46);
  g.fillRoundedRect(-12, -163, 24, 7, 3); // 뒷 칼라
  outline(g);
  g.strokeRoundedRect(-29, -160, 58, 66, 16);

  // 등번호판 + 핀 4개
  g.fillStyle(0xffffff);
  g.fillRoundedRect(-17, -143, 34, 26, 4);
  g.lineStyle(1.5, 0x2a2f4f, 0.3);
  g.strokeRoundedRect(-17, -143, 34, 26, 4);
  g.fillStyle(0xb7bccb);
  for (const [px, py] of [[-13, -139], [13, -139], [-13, -121], [13, -121]]) g.fillCircle(px, py, 1.6);
}

// 머리 (뒤통수): 귀 + 머리카락 + 광택 + 머리띠
function drawHead(g, skin) {
  // 귀
  for (const side of [-1, 1]) {
    g.fillStyle(skin.skin);
    g.fillCircle(side * 26, HEAD_Y + 4, 7);
    outline(g);
    g.strokeCircle(side * 26, HEAD_Y + 4, 7);
    g.fillStyle(0xffa8a8, 0.6);
    g.fillCircle(side * 27, HEAD_Y + 4, 3);
  }

  // 머리카락 + 뒷머리 끝 (물결 모양)
  g.fillStyle(skin.hair);
  g.fillCircle(0, HEAD_Y, HEAD_R);
  for (const x of [-15, -5, 5, 15]) g.fillCircle(x, HEAD_Y + 20, 9);
  outline(g);
  g.strokeCircle(0, HEAD_Y, HEAD_R);

  // 머리카락 결
  g.lineStyle(2, skin.hairDark, 0.6);
  g.lineBetween(-8, HEAD_Y - 4, -11, HEAD_Y + 18);
  g.lineBetween(7, HEAD_Y - 4, 10, HEAD_Y + 18);

  // 광택 (반짝이는 띠)
  g.lineStyle(4, skin.hairLight, 0.85);
  g.beginPath();
  g.arc(0, HEAD_Y, HEAD_R - 7, Phaser.Math.DegToRad(200), Phaser.Math.DegToRad(245));
  g.strokePath();

  // 머리띠 + 매듭
  g.fillStyle(skin.band);
  g.fillRoundedRect(-HEAD_R + 1, HEAD_Y - 13, HEAD_R * 2 - 2, 10, 4);
  g.fillStyle(0xffffff, 0.35);
  g.fillRect(-HEAD_R + 4, HEAD_Y - 11, HEAD_R * 2 - 8, 2);
  g.fillStyle(skin.band);
  g.fillCircle(15, HEAD_Y - 8, 6);
}

function drawPonytail(g, skin) {
  g.fillStyle(skin.hair);
  g.fillEllipse(0, 24, 20, 38);
  g.fillEllipse(0, 44, 12, 14); // 끝부분
  outline(g);
  g.strokeEllipse(0, 24, 20, 38);
  g.lineStyle(2, skin.hairDark, 0.5);
  g.lineBetween(-2, 10, -3, 40);
  g.lineStyle(3, skin.hairLight, 0.7);
  g.lineBetween(-5, 12, -6, 26);
  g.fillStyle(skin.accent);
  g.fillRoundedRect(-8, 3, 16, 6, 3); // 머리끈
}

// 다리 하나. x: 엉덩이 가로 위치, kick: 뒤로 차올린 정도(0~1), reach: 앞으로 뻗은 정도(0~1)
function drawLeg(g, skin, x, kick, reach) {
  const kneeY = KNEE_Y - kick * 10;
  const footY = -(kick * 62 + reach * 10); // 발이 올라간 높이
  const footX = x + Math.sign(x) * kick * 3;

  // 허벅지
  g.fillStyle(skin.skin);
  g.fillRoundedRect(x - 8, HIP_Y + 8, 16, kneeY - HIP_Y, 7);
  outline(g);
  g.strokeRoundedRect(x - 8, HIP_Y + 8, 16, kneeY - HIP_Y, 7);

  // 정강이 (차올리면 무릎보다 발이 위로 올라오기도 함)
  const shinTop = Math.min(kneeY, footY - 14) - 4;
  const shinHeight = Math.abs(kneeY - (footY - 14)) + 8;
  g.fillStyle(kick > 0.4 ? skin.skinShade : skin.skin);
  g.fillRoundedRect(footX - 7, shinTop, 14, shinHeight, 6);
  outline(g);
  g.strokeRoundedRect(footX - 7, shinTop, 14, shinHeight, 6);

  // 양말
  g.fillStyle(0xffffff);
  g.fillRect(footX - 7, footY - 22, 14, 8);
  g.fillStyle(skin.accent);
  g.fillRect(footX - 7, footY - 21, 14, 2);

  // 운동화 뒤꿈치. 차올릴수록 밑창이 크게 보임
  g.fillStyle(skin.shoe);
  g.fillRoundedRect(footX - 11, footY - 16, 22, 16, 6);
  g.fillStyle(skin.shoeAccent);
  g.fillRoundedRect(footX - 4, footY - 16, 8, 9, 3); // 뒤꿈치 탭
  g.fillStyle(skin.sole);
  g.fillRoundedRect(footX - 11, footY - 4 - kick * 8, 22, 4 + kick * 12, 3);
  outline(g);
  g.strokeRoundedRect(footX - 11, footY - 16, 22, 16, 6);
}

// 팔 하나. side: -1 왼쪽 / 1 오른쪽, back: +면 뒤로(카메라 쪽), -면 앞으로
function drawArm(g, skin, side, back) {
  const b = Math.max(0, back);
  const f = Math.max(0, -back);
  const shoulder = { x: side * 26, y: SHOULDER_Y + 4 };
  const elbow = { x: side * (34 + 5 * b), y: -114 + 6 * f - 6 * b };
  const hand = { x: side * (32 + 8 * b - 9 * f), y: -92 - 12 * b - 16 * f };

  // 외곽선 역할: 조금 더 굵은 진한 선을 먼저 그리고 그 위에 피부색 선
  g.lineStyle(15, OUTLINE.color, OUTLINE.alpha);
  g.lineBetween(shoulder.x, shoulder.y, elbow.x, elbow.y);
  g.lineBetween(elbow.x, elbow.y, hand.x, hand.y);
  g.lineStyle(12, skin.skin);
  g.lineBetween(shoulder.x, shoulder.y, elbow.x, elbow.y);
  g.lineBetween(elbow.x, elbow.y, hand.x, hand.y);
  g.fillStyle(skin.skin);
  g.fillCircle(elbow.x, elbow.y, 6);

  // 주먹 (뒤로 온 손은 카메라에 가까워서 조금 크게)
  const r = 7 + 2 * b;
  g.fillCircle(hand.x, hand.y, r);
  outline(g);
  g.strokeCircle(hand.x, hand.y, r);

  // 반팔 소매
  g.fillStyle(skin.shirt);
  g.fillCircle(shoulder.x, shoulder.y + 2, 12);
  g.fillStyle(skin.accent);
  g.fillRect(shoulder.x - 9, shoulder.y + 10, 18, 3);
}
