// 모든 캐릭터가 같이 쓰는 뼈대 위치와 도구
// 좌표: 발바닥이 y=0, 위로 갈수록 y가 작아짐(음수). 키는 약 205픽셀.

export const HIP_Y = -92;
export const KNEE_Y = -46;
export const SHOULDER_Y = -146;
export const HEAD_Y = -180;
export const HEAD_R = 27;
export const OUTLINE = { width: 2.5, color: 0x2b2340, alpha: 0.55 }; // 만화풍 외곽선

export function outline(g) {
  g.lineStyle(OUTLINE.width, OUTLINE.color, OUTLINE.alpha);
}

// 색을 어둡게(f<1) 또는 밝게 섞기
export function shade(color, f) {
  const r = (color >> 16) & 255;
  const g = (color >> 8) & 255;
  const b = color & 255;
  const c = (v) => Math.max(0, Math.min(255, Math.round(v * f)));
  return (c(r) << 16) | (c(g) << 8) | c(b);
}

export function mix(a, b, t) {
  const ch = (color, s) => (color >> s) & 255;
  const m = (s) => Math.round(ch(a, s) + (ch(b, s) - ch(a, s)) * t);
  return (m(16) << 16) | (m(8) << 8) | m(0);
}

// 다리 동작 계산 (모든 캐릭터 공통). kick: 뒤로 차올린 정도, reach: 앞으로 뻗은 정도
export function legPose(x, kick, reach) {
  const kneeY = KNEE_Y - kick * 10;
  const footY = -(kick * 62 + reach * 10);
  const footX = x + Math.sign(x) * kick * 3;
  return { kneeY, footY, footX };
}

// 팔 동작 계산. side: -1 왼쪽 / 1 오른쪽, back: +면 뒤로(카메라 쪽), -면 앞으로
export function armPose(side, back, spread = 0) {
  const b = Math.max(0, back);
  const f = Math.max(0, -back);
  return {
    b,
    f,
    shoulder: { x: side * (26 + spread), y: SHOULDER_Y + 4 },
    elbow: { x: side * (34 + spread + 5 * b), y: -114 + 6 * f - 6 * b },
    hand: { x: side * (32 + spread + 8 * b - 9 * f), y: -92 - 12 * b - 16 * f },
  };
}

// 굵은 선 + 외곽선으로 팔다리 한 마디 그리기
export function limbSegment(g, a, c, width, color) {
  g.lineStyle(width + 3, OUTLINE.color, OUTLINE.alpha);
  g.lineBetween(a.x, a.y, c.x, c.y);
  g.lineStyle(width, color);
  g.lineBetween(a.x, a.y, c.x, c.y);
}
