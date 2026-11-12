// "🎨 캐릭터 꾸미기" 패널
// 고른 내용은 localStorage에 저장되고, onChange로 게임 화면에 바로 반영됨

import { CHARACTERS, HUMAN_OPTIONS, ACCESSORIES, PALETTES, normalizeLook } from './skins.js';

const STORAGE_KEY = 'runningBattle.look.v1';

export function loadLook() {
  try {
    return normalizeLook(JSON.parse(localStorage.getItem(STORAGE_KEY)));
  } catch {
    return normalizeLook(null);
  }
}

function saveLook(look) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(look));
  } catch {
    // 저장 못 해도 이번 실행에서는 그대로 쓰면 됨
  }
}

const el = (tag, props = {}, children = []) => {
  const node = Object.assign(document.createElement(tag), props);
  node.append(...children);
  return node;
};

const hex = (n) => `#${n.toString(16).padStart(6, '0')}`;

// container: 패널을 그릴 곳, look: 처음 외형, onChange(newLook): 바뀔 때마다 호출
export function createLookEditor(container, look, onChange) {
  let current = look;

  const update = (patch) => {
    current = normalizeLook({ ...current, ...patch });
    saveLook(current);
    onChange(current);
    render();
  };

  // 하나만 고르는 버튼 묶음
  const chips = (label, choices, selected, pick) =>
    el('div', { className: 'look-group' }, [
      el('div', { className: 'look-label', textContent: label }),
      el(
        'div',
        { className: 'chips' },
        choices.map(([value, name]) =>
          el('button', {
            type: 'button',
            className: 'chip',
            textContent: name,
            ariaPressed: String(selected(value)),
            onclick: () => pick(value),
          })
        )
      ),
    ]);

  // 색깔 동그라미 묶음
  const swatches = (key, { label, colors }) =>
    el('div', { className: 'look-group' }, [
      el('div', { className: 'look-label', textContent: label }),
      el(
        'div',
        { className: 'chips' },
        colors.map((color) => {
          const b = el('button', {
            type: 'button',
            className: 'swatch',
            ariaLabel: `${label} ${hex(color)}`,
            ariaPressed: String(current[key] === color),
            onclick: () => update({ [key]: color }),
          });
          b.style.background = hex(color);
          return b;
        })
      ),
    ]);

  function render() {
    const rows = [
      chips('캐릭터', CHARACTERS, (v) => current.character === v, (v) => update({ character: v })),
    ];

    if (current.character === 'human') {
      for (const [key, { label, choices }] of Object.entries(HUMAN_OPTIONS)) {
        rows.push(chips(label, choices, (v) => current[key] === v, (v) => update({ [key]: v })));
      }
      rows.push(
        chips(
          '소품 (여러 개 가능)',
          ACCESSORIES,
          (v) => current.accessories.includes(v),
          (v) =>
            update({
              accessories: current.accessories.includes(v)
                ? current.accessories.filter((a) => a !== v)
                : [...current.accessories, v],
            })
        )
      );
      for (const [key, palette] of Object.entries(PALETTES)) rows.push(swatches(key, palette));
    } else {
      rows.push(el('p', { className: 'hint', textContent: '로봇과 개구리는 생김새가 정해져 있어요. 등번호만 바꿀 수 있어요.' }));
    }

    const number = el('input', {
      type: 'text',
      inputMode: 'numeric',
      maxLength: 3,
      value: current.number,
      className: 'number-input',
      ariaLabel: '등번호',
      placeholder: '없음',
    });
    // 입력할 때마다 다시 그리면 커서가 사라지므로, 입력이 끝났을 때(change) 반영
    number.addEventListener('change', () => update({ number: number.value.trim() }));
    rows.push(el('div', { className: 'look-group' }, [el('div', { className: 'look-label', textContent: '등번호' }), number]));

    container.replaceChildren(...rows);
  }

  render();
}
