# 앱 아이콘(PNG) 만들기 스크립트
# 사용법: python scripts/make-icons.py  → public/icons/ 에 아이콘 파일들이 생겨요.
# 게임 화면처럼 "지평선까지 이어지는 트랙 + 하늘 + 해"를 단순하게 그립니다.

from pathlib import Path
from PIL import Image, ImageDraw

OUT = Path(__file__).resolve().parent.parent / "public" / "icons"
SS = 4  # 크게 그린 뒤 줄여서 테두리를 부드럽게(안티에일리어싱)


def lerp(a, b, t):
    return tuple(round(x + (y - x) * t) for x, y in zip(a, b))


def draw(size, rounded=True, zoom=1.0):
    """size: 결과 크기, rounded: 모서리 둥글게, zoom: <1 이면 그림을 안쪽으로 모음(maskable용)"""
    S = size * SS
    img = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)

    horizon = S * 0.50
    # 하늘 그라데이션 (저녁 하늘)
    top, bottom = (55, 67, 127), (255, 158, 102)
    for y in range(int(horizon) + 1):
        d.line([(0, y), (S, y)], fill=lerp(top, bottom, y / horizon))
    # 해
    cx, cy, r = S * 0.5, horizon, S * 0.17 * zoom
    d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=(255, 214, 102))
    # 언덕
    d.ellipse([-S * 0.3, horizon - S * 0.07, S * 0.55, horizon + S * 0.25], fill=(79, 106, 87))
    d.ellipse([S * 0.45, horizon - S * 0.05, S * 1.3, horizon + S * 0.25], fill=(79, 106, 87))
    # 잔디
    d.rectangle([0, horizon, S, S], fill=(92, 154, 72))

    # 트랙: 아래는 넓고 지평선에서 한 점으로 모이는 사다리꼴
    vx = S * 0.5  # 소실점
    half_bottom = S * 0.62 * zoom
    track = [(vx, horizon), (vx + half_bottom, S), (vx - half_bottom, S)]
    d.polygon(track, fill=(217, 101, 59))
    # 레인 선 (흰색)
    for k in (-0.5, 0.0, 0.5):
        x_bottom = vx + half_bottom * k
        w = S * 0.018
        d.polygon([(vx, horizon), (x_bottom + w, S), (x_bottom - w, S)], fill=(255, 255, 255))
    # 트랙 양쪽 가장자리 선
    for k in (-1, 1):
        x_bottom = vx + half_bottom * k
        w = S * 0.03
        d.polygon([(vx, horizon), (x_bottom + w, S), (x_bottom - w, S)], fill=(255, 255, 255))

    # 지평선 근처를 살짝 흐리게 (안개 느낌)
    fog = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    fd = ImageDraw.Draw(fog)
    band = S * 0.08
    for i in range(int(band)):
        a = round(140 * (1 - i / band))
        fd.line([(0, horizon + i), (S, horizon + i)], fill=(243, 167, 124, a))
    img = Image.alpha_composite(img, fog)

    if rounded:
        mask = Image.new("L", (S, S), 0)
        ImageDraw.Draw(mask).rounded_rectangle([0, 0, S - 1, S - 1], radius=S * 0.22, fill=255)
        img.putalpha(mask)

    return img.resize((size, size), Image.LANCZOS)


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    draw(192).save(OUT / "icon-192.png")
    draw(512).save(OUT / "icon-512.png")
    # maskable: 안드로이드가 동그라미/물방울 등으로 잘라내므로 꽉 채우고 그림을 안쪽으로
    draw(512, rounded=False, zoom=0.8).save(OUT / "icon-maskable-512.png")
    # 아이폰 홈 화면용 (아이폰이 알아서 모서리를 둥글게 깎음)
    draw(180, rounded=False).convert("RGB").save(OUT / "apple-touch-icon.png")
    draw(64).save(OUT / "favicon-64.png")
    print("아이콘 생성 완료:", OUT)


if __name__ == "__main__":
    main()
