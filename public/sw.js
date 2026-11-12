// 서비스 워커 = 브라우저 뒤에서 몰래 도는 작은 프로그램.
// 앱 파일을 폰에 저장(캐시)해 두었다가, 인터넷이 없을 때 대신 꺼내 줍니다.
//
// 전략
// - 화면(HTML): 인터넷 먼저 시도 → 3초 안에 안 오거나 실패하면 저장된 것 사용
//   (그래서 새 버전을 배포하면 다음 실행 때 바로 반영돼요)
// - 나머지(JS, 이미지 등): 저장된 것 먼저 사용 → 없으면 인터넷에서 받아서 저장
//   (Vite가 파일 이름에 해시를 붙여서, 내용이 바뀌면 이름도 바뀌므로 안전)
//
// 캐시 구조를 크게 바꿨을 때만 아래 버전 숫자를 올리면 예전 저장본이 지워져요.
const CACHE = 'running-battle-v1';

const CORE_FILES = ['./', './manifest.webmanifest', './icons/icon-192.png', './icons/icon-512.png'];

// 설치: 기본 파일 + index.html이 불러오는 JS/CSS 파일까지 미리 저장
self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE);
      await cache.addAll(CORE_FILES);
      // index.html 안에서 ./assets/... 로 시작하는 파일 이름을 찾아서 함께 저장
      const html = await (await cache.match('./')).text();
      const assets = [...html.matchAll(/(?:src|href)="(\.?\/?assets\/[^"]+)"/g)].map((m) => m[1]);
      await cache.addAll(assets);
      self.skipWaiting(); // 새 버전을 기다리지 않고 바로 적용
    })()
  );
});

// 활성화: 버전이 다른 예전 캐시 지우기
self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)));
      await self.clients.claim();
    })()
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET' || new URL(request.url).origin !== location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith(networkFirst(request));
  } else {
    event.respondWith(cacheFirst(request));
  }
});

async function networkFirst(request) {
  const cache = await caches.open(CACHE);
  try {
    const response = await withTimeout(fetch(request), 3000);
    if (response.ok) cache.put('./', response.clone());
    return response;
  } catch {
    return (await cache.match('./')) ?? Response.error();
  }
}

async function cacheFirst(request) {
  const cached = await caches.match(request, { ignoreSearch: true });
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok) (await caches.open(CACHE)).put(request, response.clone());
  return response;
}

function withTimeout(promise, ms) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('timeout')), ms);
    promise.then(
      (v) => (clearTimeout(timer), resolve(v)),
      (e) => (clearTimeout(timer), reject(e))
    );
  });
}
