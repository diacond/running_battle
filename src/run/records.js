// 기록 저장소 (브라우저의 localStorage 사용)
// localStorage = 브라우저에 글자를 저장해 두는 작은 창고. 앱을 껐다 켜도 남아 있음.
// (주의: 크롬의 "사이트 데이터 삭제"를 하면 같이 지워져요)

const RECORDS_KEY = 'runningBattle.records.v1'; // 끝난 기록들
const ACTIVE_KEY = 'runningBattle.activeRun.v1'; // 지금 달리는 중인 기록 (앱이 갑자기 닫힐 때 대비)

function read(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key)) ?? fallback;
  } catch {
    return fallback;
  }
}

function write(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.warn('저장 실패', e);
  }
}

// 최신 기록이 맨 앞
export function loadRecords() {
  return read(RECORDS_KEY, []);
}

export function saveRecord(record) {
  const list = loadRecords().filter((r) => r.id !== record.id);
  list.unshift(record);
  write(RECORDS_KEY, list);
}

export function deleteRecord(id) {
  write(RECORDS_KEY, loadRecords().filter((r) => r.id !== id));
}

export function saveActiveRun(snapshot) {
  write(ACTIVE_KEY, snapshot);
}

export function loadActiveRun() {
  return read(ACTIVE_KEY, null);
}

export function clearActiveRun() {
  try {
    localStorage.removeItem(ACTIVE_KEY);
  } catch {
    // 무시
  }
}
