// 결과 화면과 기록 목록을 그리는 코드

import { formatPace, formatDistance, formatDuration } from '../format.js';

const $ = (id) => document.getElementById(id);
const MODE_NAMES = { manual: '수동', gps: 'GPS', sim: '시뮬레이션' };

function avgKmh(r) {
  return r.elapsedMs > 0 ? r.distanceM / 1000 / (r.elapsedMs / 3600000) : 0;
}

function formatDate(ms) {
  const d = new Date(ms);
  const days = ['일', '월', '화', '수', '목', '금', '토'];
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${d.getMonth() + 1}월 ${d.getDate()}일 (${days[d.getDay()]}) ${hh}:${mm}`;
}

// 결과 화면 열기. onDelete: "기록 삭제"를 눌렀을 때 할 일
export function showResult(record, { onDelete, extraNote = '' } = {}) {
  const dialog = $('result-dialog');
  $('result-date').textContent = `${formatDate(record.startedAt)} · ${MODE_NAMES[record.mode] ?? record.mode}`;
  $('result-distance').textContent = formatDistance(record.distanceM);
  $('result-time').textContent = formatDuration(record.elapsedMs / 1000);
  $('result-pace').textContent = `${formatPace(avgKmh(record))} /km`;
  $('result-speed').textContent = `${avgKmh(record).toFixed(1)} km/h`;
  $('result-max').textContent = `${record.maxSpeedKmh.toFixed(1)} km/h`;

  // 1km 구간 기록 (각 km를 몇 분 몇 초에 달렸는지)
  const splits = $('result-splits');
  splits.replaceChildren();
  record.splits.forEach((ms, i) => {
    const sec = (ms - (record.splits[i - 1] ?? 0)) / 1000;
    const li = document.createElement('li');
    li.append(`${i + 1} km`, Object.assign(document.createElement('span'), { textContent: formatDuration(sec) }));
    splits.append(li);
  });

  const notes = [extraNote];
  if (record.gapMs > 0) {
    notes.push(
      `화면이 꺼져 있던 ${formatDuration(record.gapMs / 1000)} 동안은 GPS를 못 받아서, ` +
        `${formatDistance(record.gapDistanceM)}를 직선거리로 추정했어요.`
    );
  }
  if (record.recovered) notes.push('앱이 중간에 닫혀서, 마지막으로 저장된 지점까지 자동으로 기록했어요.');
  $('result-note').textContent = notes.filter(Boolean).join(' ');

  $('result-delete').onclick = () => {
    if (!confirm('이 기록을 삭제할까요? 되돌릴 수 없어요.')) return;
    dialog.close();
    onDelete?.(record);
  };
  $('result-close').onclick = () => dialog.close();
  dialog.showModal();
}

// 기록 목록 그리기. onSelect: 기록을 눌렀을 때 할 일
export function renderRecordList(records, onSelect) {
  const list = $('records-list');
  list.replaceChildren();
  $('records-empty').hidden = records.length > 0;

  for (const r of records) {
    const button = document.createElement('button');
    const left = document.createElement('div');
    left.append(
      Object.assign(document.createElement('div'), { className: 'date', textContent: formatDate(r.startedAt) }),
      Object.assign(document.createElement('div'), { className: 'main', textContent: formatDistance(r.distanceM) })
    );
    const right = Object.assign(document.createElement('div'), { className: 'sub' });
    right.append(
      formatDuration(r.elapsedMs / 1000),
      document.createElement('br'),
      `${formatPace(avgKmh(r))} /km`
    );
    button.append(left, right);
    button.addEventListener('click', () => onSelect(r));

    const li = document.createElement('li');
    li.append(button);
    list.append(li);
  }
}
