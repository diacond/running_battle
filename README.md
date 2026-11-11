# running_battle
running competition

러닝 페이스에 맞춰 오리지널 캐릭터가 달리는 2D 횡스크롤 웹앱입니다.

## 실행 방법

```bash
npm install   # 처음 한 번만
npm run dev   # 개발 서버 실행 → 터미널에 나온 주소(http://localhost:5173)를 브라우저로 열기
```

## 파일 구조

- `index.html` — 게임 화면 자리 + 속도 슬라이더/버튼
- `src/main.js` — 게임 시작, 슬라이더 값을 게임에 전달, 페이스 계산
- `src/RunScene.js` — 배경 스크롤(패럴랙스), 거리 계산, 거리 표지판
- `src/Runner.js` — 오리지널 캐릭터(도형으로 그림)와 달리기 동작

## 숫자 바꿔보기

- `RunScene.js`의 `PIXELS_PER_METER` — 클수록 배경이 빨리 흐름
- `Runner.js`의 `COLORS` — 캐릭터 색깔
- `Runner.js`의 `cyclesPerSec` — 다리 움직이는 빠르기
