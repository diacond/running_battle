// 캐릭터 외형(룩) 정보
// "룩(look)" = 사용자가 고른 것 (머리, 옷, 소품, 색깔). localStorage에 저장됨.
// 나중에 "내 사진으로 아바타 만들기"를 하면, 사진에서 뽑은 머리색·피부톤을 이 룩에 넣으면 됨.

// 선택지: [값, 화면에 보일 이름]
export const HUMAN_OPTIONS = {
  hairStyle: { label: '머리 모양', choices: [['ponytail', '포니테일'], ['short', '짧은 머리'], ['bob', '단발']] },
  headgear: { label: '머리 위', choices: [['band', '머리띠'], ['cap', '모자'], ['none', '없음']] },
  top: { label: '상의', choices: [['tshirt', '반팔'], ['tank', '민소매'], ['longsleeve', '긴팔'], ['windbreaker', '바람막이']] },
  bottom: { label: '하의', choices: [['shorts', '반바지'], ['leggings', '레깅스']] },
};

export const ACCESSORIES = [
  ['earphones', '🎧 이어폰'],
  ['watch', '⌚ 시계'],
  ['backpack', '🎒 배낭'],
];

export const PALETTES = {
  hairColor: { label: '머리색', colors: [0x4a3428, 0x1e1a1a, 0x8a5a3c, 0xd9b26f, 0xc0504d, 0x9aa0a8] },
  skinColor: { label: '피부', colors: [0xffe4cc, 0xffd9b8, 0xe8b48f, 0xc68a62, 0x8d5a3b] },
  topColor: { label: '상의 색', colors: [0x4f8cff, 0xff5c7a, 0x2fbf71, 0x2a2f3d, 0xf4f5f7, 0xffb02e, 0x8b5cf6] },
  bottomColor: { label: '하의 색', colors: [0x2a2f4f, 0x16181d, 0x6b7280, 0x3b82f6, 0xec4899] },
  shoeColor: { label: '운동화', colors: [0xffffff, 0x2a2f3d, 0xff5c7a, 0x2fbf71, 0xffd23f] },
  accentColor: { label: '포인트 색', colors: [0xff5c7a, 0xffd23f, 0x4cd18a, 0x00c2ff, 0xffffff] },
};

export const DEFAULT_LOOK = {
  number: '7', // 등번호
  hairStyle: 'ponytail',
  headgear: 'band',
  top: 'tshirt',
  bottom: 'shorts',
  accessories: [],
  hairColor: 0x4a3428,
  skinColor: 0xffd9b8,
  topColor: 0x4f8cff,
  bottomColor: 0x2a2f4f,
  shoeColor: 0xffffff,
  accentColor: 0xff5c7a,
};

// 저장된 룩에 빠진 값이 있으면 기본값으로 채움 (나중에 항목이 늘어나도 안전하게)
export function normalizeLook(saved) {
  const look = { ...DEFAULT_LOOK, ...(saved ?? {}) };
  for (const [key, { choices }] of Object.entries(HUMAN_OPTIONS)) {
    if (!choices.some(([v]) => v === look[key])) look[key] = DEFAULT_LOOK[key];
  }
  look.accessories = Array.isArray(look.accessories)
    ? look.accessories.filter((a) => ACCESSORIES.some(([k]) => k === a))
    : [];
  for (const key of Object.keys(PALETTES)) {
    if (typeof look[key] !== 'number') look[key] = DEFAULT_LOOK[key];
  }
  look.number = String(look.number ?? '').slice(0, 3);
  return look;
}
