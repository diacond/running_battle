// 예쁜 확인 창 (브라우저 기본 confirm 대신)
// 사용법: if (await askConfirm({ title, text, yes, no })) { ... }

const $ = (id) => document.getElementById(id);

export function askConfirm({ title, text = '', yes = '확인', no = '취소' }) {
  const dialog = $('confirm-dialog');
  $('confirm-title').textContent = title;
  $('confirm-text').textContent = text;
  $('confirm-yes').textContent = yes;
  $('confirm-no').textContent = no;

  return new Promise((resolve) => {
    const done = (answer) => {
      dialog.onclose = null;
      dialog.close();
      resolve(answer);
    };
    $('confirm-yes').onclick = () => done(true);
    $('confirm-no').onclick = () => done(false);
    dialog.onclose = () => resolve(false); // 뒤로가기·Esc로 닫으면 "아니오"
    dialog.showModal();
  });
}
