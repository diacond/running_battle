// 달리는 캐릭터 (뒷모습). 카메라가 뒤에서 따라가므로 뒷모습을 그림.
//
// 이 파일은 "움직임"(통통 튀기, 흔들기, 다리 휘두르는 박자)만 담당하고,
// "생김새"는 캐릭터별 파일(src/characters/)이 담당함.
// 새 캐릭터를 추가하려면 characters/ 에 파일을 만들고 아래 CHARACTER_MAKERS에 등록하면 됨.
//
// 캐릭터 파일이 돌려줘야 하는 것:
//   parts      : 몸통·머리 등 고정된 그림들 (배열)
//   drawLimbs  : 팔다리를 매 프레임 그리는 함수 (g, swing, amount, leftKick, rightKick)
//   animate    : (선택) 머리카락·안테나 등 따로 흔들리는 부분을 움직이는 함수

import { makeHuman } from './characters/human.js';
import { makeRobot } from './characters/robot.js';
import { makeFrog } from './characters/frog.js';
import { DEFAULT_LOOK } from './skins.js';

const CHARACTER_MAKERS = { human: makeHuman, robot: makeRobot, frog: makeFrog };

export class Runner {
  // look: 사용자가 고른 외형 (skins.js 참고)
  constructor(scene, x, groundY, look = DEFAULT_LOOK) {
    this.phase = 0; // 달리기 동작이 한 바퀴 중 어디쯤인지 (0 ~ 2π)

    this.root = scene.add.container(x, groundY);
    this.shadow = scene.add.ellipse(0, 0, 100, 20, 0x000000, 0.28);

    // body: 통통 튀고 좌우로 살짝 흔들리는 부분 (그림자는 땅에 그대로)
    this.body = scene.add.container(0, 0);
    this.limbs = scene.add.graphics(); // 팔다리는 모양이 계속 바뀌어서 매 프레임 다시 그림

    const make = CHARACTER_MAKERS[look.character] ?? makeHuman;
    this.character = make(scene, look);

    this.body.add([this.limbs, ...this.character.parts]);
    this.root.add([this.shadow, this.body]);
  }

  setDepth(depth) {
    this.root.setDepth(depth);
    return this;
  }

  destroy() {
    this.root.destroy(); // 안에 든 그림들도 같이 지워짐
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

    this.limbs.clear();
    this.character.drawLimbs(this.limbs, swing, amount, leftKick, rightKick);

    // 몸 통통 튀기 + 좌우 흔들림 + 멈춰 있을 때 숨쉬기
    const bounce = 8 * amount * Math.abs(Math.cos(this.phase));
    const breathe = (1 - amount) * 1.5 * Math.sin(timeSec * 3);
    this.body.y = -bounce - breathe;
    this.body.x = swing * 3 * amount;
    this.body.rotation = swing * 0.03 * amount;
    this.shadow.scaleX = 1 - bounce * 0.02;

    this.character.animate?.({ swing, amount, timeSec, speedKmh, phase: this.phase });
  }
}
