import { defineConfig } from 'vite';

export default defineConfig({
  // GitHub Pages 주소가 https://아이디.github.io/running_battle/ 처럼 하위 폴더라서
  // 파일 경로를 상대 경로('./')로 만들어야 함
  base: './',
});
