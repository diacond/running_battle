// 캐릭터 외형(스킨) 정보
// 나중에 "내 사진으로 아바타 만들기"를 하면, 사진에서 뽑은 머리색·피부톤 등을
// 이 모양의 객체로 만들어서 Runner에 넘겨주면 됨.

export const DEFAULT_SKIN = {
  number: '7', // 등번호
  hairStyle: 'ponytail', // 'ponytail'(포니테일) | 'short'(짧은 머리)

  skin: 0xffd9b8, // 피부
  skinShade: 0xf2c29e, // 피부 그늘
  hair: 0x4a3428, // 머리카락
  hairDark: 0x2e1f17, // 머리카락 결
  hairLight: 0x8a6650, // 머리카락 광택
  band: 0xff5c7a, // 머리띠

  shirt: 0x4f8cff, // 유니폼
  shirtShade: 0x3a72e0, // 유니폼 그늘
  accent: 0xffd23f, // 포인트 색 (옆선, 칼라, 양말 줄)
  shorts: 0x2a2f4f, // 반바지

  shoe: 0xffffff, // 운동화
  shoeAccent: 0x4f8cff, // 운동화 뒤꿈치
  sole: 0xff5c7a, // 운동화 밑창
};
