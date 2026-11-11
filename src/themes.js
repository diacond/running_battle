// 시간대별 색깔 모음 (낮 / 저녁·새벽 / 밤)

export const THEMES = {
  day: {
    icon: '☀️',
    skyTop: 0x5fb4ef,
    skyBottom: 0xd4efff,
    farHills: 0x9db8d6,
    nearHills: 0x7fbf6e,
    grass: 0x6cc04a,
    grassDark: 0x62b343,
    track: 0xd9653b,
    trackDark: 0xcf5d35,
    line: 0xffffff,
    fog: 0xd4efff,
    pole: 0x8a93a6,
    lampLight: 0, // 가로등 밝기 (0 = 꺼짐)
  },
  evening: {
    icon: '🌇',
    skyTop: 0x37437f,
    skyBottom: 0xff9e66,
    farHills: 0x7a6896,
    nearHills: 0x4f6a57,
    grass: 0x5c9a48,
    grassDark: 0x558f42,
    track: 0xc65a3a,
    trackDark: 0xbb5335,
    line: 0xf5ece4,
    fog: 0xf3a77c,
    pole: 0x5b5f73,
    lampLight: 0.5,
  },
  night: {
    icon: '🌙',
    skyTop: 0x070b24,
    skyBottom: 0x222d60,
    farHills: 0x2a3462,
    nearHills: 0x1b3226,
    grass: 0x2f5e32,
    grassDark: 0x2a5530,
    track: 0x93442f,
    trackDark: 0x883e2b,
    line: 0xd9dde8,
    fog: 0x222d60,
    pole: 0x3d4257,
    lampLight: 1,
  },
};

// 현재 시각(0~23시)으로 시간대 고르기
export function themeForHour(hour) {
  if (hour >= 7 && hour < 17) return 'day';
  if ((hour >= 5 && hour < 7) || (hour >= 17 && hour < 19)) return 'evening';
  return 'night';
}
