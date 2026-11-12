// 달리기 한 번(시작 ~ 종료)의 기록을 관리하는 클래스
//
// - 시간: 실제 시계(Date.now) 기준. 화면이 꺼져 있던 동안도 정확히 흘러감
// - 거리: tick()이 불릴 때마다 "속도 × 흐른 시간"을 더함
// - 화면이 꺼지면 tick()이 한동안 안 불림 → 그 구간("공백")은 속도로 계산하지 않고,
//   대신 GPS 위치 두 점 사이 직선거리를 addDistance(m, true)로 따로 더해 줌 (main.js)
//
// 앱(Capacitor)으로 옮기면 화면이 꺼져도 GPS가 계속 오므로 공백 자체가 거의 없어짐.

const GAP_MS = 5000; // tick 사이가 5초보다 길면 "화면 꺼짐 등으로 멈춰 있던 공백"으로 봄

export class RunSession {
  constructor(mode, now = Date.now()) {
    this.id = String(now);
    this.mode = mode; // 'manual' | 'gps' | 'sim'
    this.state = 'running'; // running(달리는 중) | paused(일시정지) | finished(끝)
    this.startedAt = now;
    this.endedAt = null;
    this.lastTick = now;
    this.lastSpeedKmh = 0;

    this.elapsedMs = 0; // 일시정지를 뺀 총 시간
    this.distanceM = 0; // 총 거리
    this.maxSpeedKmh = 0;
    this.splits = []; // 1km, 2km, … 에 도착했을 때의 elapsedMs
    this.gapMs = 0; // 화면 꺼짐 등으로 속도를 못 받은 시간
    this.gapDistanceM = 0; // 그 동안 직선거리로 추정해서 더한 거리
    this.recovered = false; // 앱이 닫혀서 자동으로 저장된 기록인지
  }

  // 1초에 몇 번씩 불러 줌. 공백이 있었으면 true를 돌려줌
  tick(now, speedKmh) {
    const dt = now - this.lastTick;
    this.lastTick = now;
    if (this.state !== 'running' || dt <= 0) return false;

    this.elapsedMs += dt;
    if (dt > GAP_MS) {
      this.gapMs += dt;
      return true;
    }
    this.lastSpeedKmh = speedKmh;
    this.maxSpeedKmh = Math.max(this.maxSpeedKmh, speedKmh);
    this.addDistance((speedKmh / 3.6) * (dt / 1000));
    return false;
  }

  addDistance(meters, isGapEstimate = false) {
    this.distanceM += meters;
    if (isGapEstimate) this.gapDistanceM += meters;
    // 1km를 넘을 때마다 구간 기록
    while (this.distanceM >= (this.splits.length + 1) * 1000) {
      this.splits.push(this.elapsedMs);
    }
  }

  pause(now = Date.now()) {
    if (this.state !== 'running') return;
    this.tick(now, this.lastSpeedKmh);
    this.state = 'paused';
  }

  resume(now = Date.now()) {
    if (this.state !== 'paused') return;
    this.lastTick = now; // 쉬던 시간은 빼고 다시 셈
    this.state = 'running';
  }

  finish(now = Date.now()) {
    if (this.state === 'running') this.tick(now, this.lastSpeedKmh);
    this.state = 'finished';
    this.endedAt = now;
  }

  get avgSpeedKmh() {
    return this.elapsedMs > 0 ? this.distanceM / 1000 / (this.elapsedMs / 3600000) : 0;
  }

  // 저장용 (localStorage에는 글자만 넣을 수 있어서 평범한 객체로 바꿈)
  toJSON() {
    const { id, mode, state, startedAt, endedAt, lastTick, lastSpeedKmh } = this;
    const { elapsedMs, distanceM, maxSpeedKmh, splits, gapMs, gapDistanceM, recovered } = this;
    return { id, mode, state, startedAt, endedAt, lastTick, lastSpeedKmh, elapsedMs, distanceM, maxSpeedKmh, splits, gapMs, gapDistanceM, recovered };
  }

  static fromJSON(data) {
    return Object.assign(new RunSession(data.mode, data.startedAt), data);
  }
}
