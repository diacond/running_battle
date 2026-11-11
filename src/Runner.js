// 오리지널 캐릭터: 머리띠를 한 동글동글한 꼬마 러너
// 그림 파일 없이 도형으로 그리고, 팔다리를 회전시켜서 달리는 동작을 만듦.
//
// 회전 방향 참고: Phaser에서 rotation이 +면 시계 방향.
// 아래를 향한 다리를 +로 돌리면 뒤(왼쪽)로, -로 돌리면 앞(오른쪽)으로 감.

const COLORS = {
  skin: 0xffd6a5,
  skinDark: 0xe8b98a,
  hair: 0x3b2a20,
  shirt: 0x3d7bff,
  shorts: 0x26324d,
  shortsDark: 0x1a2236,
  band: 0xff4d6d,
  shoe: 0xffffff,
  shoeDark: 0xd6dbe6,
  sole: 0xff4d6d,
};

export class Runner {
  constructor(scene, x, groundY) {
    this.scene = scene;
    this.phase = 0; // 달리기 동작이 지금 한 바퀴 중 어디쯤인지(0 ~ 2π)

    // root: 발바닥 위치 기준
    this.root = scene.add.container(x, groundY).setScale(1.3);
    this.shadow = scene.add.ellipse(0, 0, 54, 10, 0x000000, 0.2);

    // bodyGroup: 위아래로 통통 튀는 부분 (그림자는 땅에 그대로)
    this.bodyGroup = scene.add.container(0, 0);
    const hipY = -42;

    this.backLeg = makeLeg(scene, hipY, true);
    this.frontLeg = makeLeg(scene, hipY, false);

    // upper: 엉덩이 기준 상체 (속도가 빠를수록 앞으로 기울임)
    this.upper = scene.add.container(0, hipY);
    this.backArm = makeArm(scene, true);

    const torso = scene.add.graphics();
    torso.fillStyle(COLORS.shorts);
    torso.fillRoundedRect(-11, -6, 22, 12, 4);
    torso.fillStyle(COLORS.shirt);
    torso.fillRoundedRect(-11, -32, 22, 28, 7);
    torso.fillStyle(0xffffff);
    torso.fillRect(-11, -20, 22, 3); // 셔츠 줄무늬

    // 머리띠 끈 (뒤로 펄럭임)
    this.bandTail = scene.add.graphics({ x: -9, y: -53 });
    this.bandTail.fillStyle(COLORS.band);
    this.bandTail.fillTriangle(0, -2, -18, -6, -16, 2);
    this.bandTail.fillTriangle(0, 1, -15, 6, -11, 10);

    const head = scene.add.graphics();
    head.fillStyle(COLORS.skin);
    head.fillCircle(4, -48, 15);
    head.fillStyle(COLORS.hair);
    head.slice(4, -48, 15, Math.PI * 0.95, Math.PI * 1.85, false);
    head.fillPath();
    head.fillStyle(COLORS.band);
    head.fillRect(-11, -56, 30, 6);
    head.fillStyle(0x1d2333);
    head.fillCircle(12, -46, 2.2); // 눈
    head.fillStyle(0xff9fa8, 0.7);
    head.fillCircle(11, -40, 3); // 볼

    this.frontArm = makeArm(scene, false);

    this.upper.add([this.backArm.root, torso, this.bandTail, head, this.frontArm.root]);
    this.bodyGroup.add([this.backLeg.root, this.upper, this.frontLeg.root]);
    this.root.add([this.shadow, this.bodyGroup]);
  }

  // 매 프레임 호출. speedKmh: 현재 속도, dt: 흐른 시간(초), timeSec: 전체 시간(초)
  update(speedKmh, dt, timeSec) {
    // 동작의 크기: 0 km/h면 0(가만히 서 있음), 8 km/h 이상이면 1(최대)
    const amount = Math.min(speedKmh / 8, 1);

    // 1초에 다리를 몇 번 휘두를지. 10 km/h ≈ 1.45회/초 (≈ 분당 174걸음)
    const cyclesPerSec = speedKmh > 0 ? 0.8 + speedKmh * 0.065 : 0;
    this.phase = (this.phase + cyclesPerSec * Math.PI * 2 * dt) % (Math.PI * 2);

    const p = this.phase;
    const legSwing = 0.85 * amount; // 다리 흔드는 각도
    const kneeBend = 1.6 * amount; // 무릎 접히는 정도
    const armSwing = 0.8 * amount;

    // 다리: 두 다리는 반대 박자(π 차이)
    poseLeg(this.backLeg, p, legSwing, kneeBend, 0.08 * (1 - amount));
    poseLeg(this.frontLeg, p + Math.PI, legSwing, kneeBend, -0.08 * (1 - amount));

    // 팔: 같은 쪽 다리와 반대로 흔듦
    this.frontArm.root.rotation = -armSwing * Math.sin(p);
    this.backArm.root.rotation = -armSwing * Math.sin(p + Math.PI);
    this.frontArm.lower.rotation = -0.3 - 1.3 * amount;
    this.backArm.lower.rotation = -0.3 - 1.3 * amount;

    // 몸통 통통 튀기 (한 바퀴에 두 번 = 걸음마다 한 번)
    const bounce = 6 * amount * Math.abs(Math.sin(p));
    this.bodyGroup.y = -bounce;
    this.shadow.scaleX = 1 - bounce * 0.03;

    // 상체 앞으로 기울이기 + 멈춰 있을 때 숨쉬기
    this.upper.rotation = Math.min(speedKmh, 20) * 0.012;
    this.upper.scaleY = 1 + (1 - amount) * 0.025 * Math.sin(timeSec * 3);

    // 머리띠 끈 펄럭이기
    this.bandTail.rotation = -0.2 * amount + Math.sin(timeSec * (6 + speedKmh)) * (0.08 + 0.15 * amount);
  }
}

// 다리 하나: 허벅지(엉덩이에서 회전) + 정강이(무릎에서 회전) + 신발
function makeLeg(scene, hipY, isBack) {
  const root = scene.add.container(0, hipY);
  const thigh = scene.add.graphics();
  thigh.fillStyle(isBack ? COLORS.shortsDark : COLORS.shorts);
  thigh.fillRoundedRect(-6, -2, 12, 12, 4);
  thigh.fillStyle(isBack ? COLORS.skinDark : COLORS.skin);
  thigh.fillRoundedRect(-4.5, 8, 9, 14, 4);

  const lower = scene.add.container(0, 20);
  const shin = scene.add.graphics();
  shin.fillStyle(isBack ? COLORS.skinDark : COLORS.skin);
  shin.fillRoundedRect(-4, 0, 8, 18, 4);
  shin.fillStyle(isBack ? COLORS.shoeDark : COLORS.shoe);
  shin.fillRoundedRect(-5, 15, 17, 7, 3);
  shin.fillStyle(COLORS.sole);
  shin.fillRect(-5, 20, 17, 2);
  lower.add(shin);

  root.add([thigh, lower]);
  return { root, lower };
}

// 팔 하나: 윗팔(어깨에서 회전) + 아래팔(팔꿈치에서 회전) + 주먹
function makeArm(scene, isBack) {
  const root = scene.add.container(2, -27);
  const color = isBack ? COLORS.skinDark : COLORS.skin;
  const upper = scene.add.graphics();
  upper.fillStyle(isBack ? 0x2f63d6 : COLORS.shirt);
  upper.fillRoundedRect(-4.5, -3, 9, 9, 3); // 반팔 소매
  upper.fillStyle(color);
  upper.fillRoundedRect(-3.5, 4, 7, 11, 3);

  const lower = scene.add.container(0, 13);
  const forearm = scene.add.graphics();
  forearm.fillStyle(color);
  forearm.fillRoundedRect(-3, 0, 6, 12, 3);
  forearm.fillCircle(0, 13, 4);
  lower.add(forearm);

  root.add([upper, lower]);
  return { root, lower };
}

// 다리 자세 계산
// sin(phase) > 0 이면 다리가 앞쪽, < 0 이면 뒤쪽
// cos(phase) > 0 이면 다리가 앞으로 넘어오는 중 → 이때 무릎을 크게 접음
function poseLeg(leg, phase, swing, kneeBend, standOffset) {
  leg.root.rotation = -swing * Math.sin(phase) + standOffset;
  leg.lower.rotation = 0.05 + kneeBend * Math.max(0, Math.cos(phase)) * 0.8;
}
