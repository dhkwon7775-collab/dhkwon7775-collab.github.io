# 유튜브 쇼츠 자동 생성기 (1080x1920, AI 음성 + 자막)
# 사용법: python make_short.py
# 다른 영상을 만들려면 아래 TITLE / SEGMENTS 내용만 바꾸면 됩니다.
import asyncio, os, re, subprocess, sys
import edge_tts, imageio_ffmpeg
from PIL import Image, ImageDraw, ImageFont

TITLE = "신기한사실_5가지"
VOICE = "ko-KR-SunHiNeural"   # 남자 목소리: ko-KR-InJoonNeural
RATE = "+12%"

# 각 장면: 큰 글씨(head), 작은 글씨(sub), 읽어줄 대사(say), 배경색 2개, 번호(num)
SEGMENTS = [
    dict(num="", head="99%가 모르는\n신기한 사실 5가지", sub="마지막 건 진짜 충격",
         say="99퍼센트가 모르는 신기한 사실 다섯 가지. 마지막 건 진짜 충격입니다.",
         c1=(20, 20, 40), c2=(90, 30, 120)),
    dict(num="1", head="꿀은 썩지 않는다", sub="고대 이집트 무덤에서 나온\n3000년 된 꿀도 먹을 수 있는 상태",
         say="첫 번째. 꿀은 썩지 않습니다. 이집트 고대 무덤에서 발견된 삼천 년 된 꿀도 여전히 먹을 수 있는 상태였다고 해요.",
         c1=(120, 70, 0), c2=(230, 160, 20)),
    dict(num="2", head="문어는 심장이\n3개다", sub="게다가 피는 파란색",
         say="두 번째. 문어는 심장이 세 개입니다. 게다가 피 색깔은 파란색이에요.",
         c1=(10, 40, 90), c2=(30, 120, 200)),
    dict(num="3", head="바나나는 베리,\n딸기는 아니다", sub="식물학 기준으로는 그렇습니다",
         say="세 번째. 식물학적으로 바나나는 베리에 속하지만, 딸기는 베리가 아닙니다.",
         c1=(120, 10, 40), c2=(220, 60, 90)),
    dict(num="4", head="에펠탑은\n여름에 자란다", sub="철이 열에 늘어나\n최대 약 15cm 높아져요",
         say="네 번째. 에펠탑은 여름이 되면 키가 자랍니다. 철이 열에 늘어나서 최대 십오 센티미터 정도 높아져요.",
         c1=(30, 30, 30), c2=(110, 90, 60)),
    dict(num="5", head="상어는 나무보다\n먼저 생겼다", sub="상어: 약 4억 5천만 년 전\n나무: 약 3억 9천만 년 전",
         say="마지막. 상어는 나무보다 먼저 지구에 나타났습니다. 상어는 약 사억 오천만 년 전, 나무는 약 삼억 구천만 년 전이에요.",
         c1=(0, 50, 60), c2=(0, 140, 140)),
    dict(num="", head="몰랐다면\n구독!", sub="매일 신기한 사실을 알려드려요",
         say="몰랐던 게 하나라도 있었다면, 구독하고 내일 또 만나요.",
         c1=(140, 0, 0), c2=(230, 40, 40)),
]

W, H, FPS, PAD = 1080, 1920, 30, 0.35
FONT_B = "C:/Windows/Fonts/malgunbd.ttf"
FFMPEG = imageio_ffmpeg.get_ffmpeg_exe()
HERE = os.path.dirname(os.path.abspath(__file__))
WORK = os.path.join(HERE, "_work")
os.makedirs(WORK, exist_ok=True)


def font(size):
    return ImageFont.truetype(FONT_B, size)


def duration(path):
    err = subprocess.run([FFMPEG, "-i", path], capture_output=True, text=True, encoding="utf-8", errors="ignore").stderr
    h, m, s = re.search(r"Duration: (\d+):(\d+):([\d.]+)", err).groups()
    return int(h) * 3600 + int(m) * 60 + float(s)


def fit_lines(draw, text, f, max_w):
    out = []
    for para in text.split("\n"):
        line = ""
        for word in para.split(" "):
            test = (line + " " + word).strip()
            if draw.textlength(test, font=f) <= max_w or not line:
                line = test
            else:
                out.append(line)
                line = word
        out.append(line)
    return out


def draw_block(draw, lines, f, y, fill, stroke=0):
    for ln in lines:
        w = draw.textlength(ln, font=f)
        draw.text(((W - w) / 2, y), ln, font=f, fill=fill, stroke_width=stroke, stroke_fill=(0, 0, 0))
        y += int(f.size * 1.3)
    return y


def background(c1, c2):
    img = Image.new("RGB", (W, H))
    d = ImageDraw.Draw(img)
    for y in range(H):
        t = y / H
        d.line([(0, y), (W, y)], fill=tuple(int(a + (b - a) * t) for a, b in zip(c1, c2)))
    # 은은한 장식 원
    over = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    od = ImageDraw.Draw(over)
    od.ellipse((-300, -200, 600, 700), fill=(255, 255, 255, 18))
    od.ellipse((500, 1300, 1400, 2200), fill=(255, 255, 255, 14))
    img = Image.alpha_composite(img.convert("RGBA"), over)
    d = ImageDraw.Draw(img)
    tag = "알아두면 쓸모있는 잡학"
    f = font(44)
    d.text(((W - d.textlength(tag, font=f)) / 2, 170), tag, font=f, fill=(255, 255, 255, 200))
    return img


def text_layer(seg):
    layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    fh, fs = font(118), font(58)
    head = fit_lines(d, seg["head"], fh, W - 140)
    sub = fit_lines(d, seg["sub"], fs, W - 160)
    num_h = 260 if seg["num"] else 0
    total = num_h + len(head) * int(fh.size * 1.3) + 60 + len(sub) * int(fs.size * 1.3)
    y = (H - total) // 2 - 40
    if seg["num"]:
        r = 110
        d.ellipse((W / 2 - r, y, W / 2 + r, y + 2 * r), fill=(255, 255, 255))
        fn = font(140)
        nw = d.textlength(seg["num"], font=fn)
        d.text(((W - nw) / 2, y + 10), seg["num"], font=fn, fill=seg["c1"])
        y += num_h
    y = draw_block(d, head, fh, y, (255, 255, 255), stroke=6)
    y += 60
    # 보조 문구 뒤 반투명 박스
    box_h = len(sub) * int(fs.size * 1.3) + 50
    d.rounded_rectangle((70, y - 25, W - 70, y - 25 + box_h), radius=36, fill=(0, 0, 0, 110))
    draw_block(d, sub, fs, y, (255, 235, 140))
    return layer


async def tts(text, path):
    await edge_tts.Communicate(text, VOICE, rate=RATE).save(path)


def main():
    durs, wavs = [], []
    for i, seg in enumerate(SEGMENTS):
        mp3 = os.path.join(WORK, f"v{i}.mp3")
        print(f"[음성] {i + 1}/{len(SEGMENTS)}")
        asyncio.run(tts(seg["say"], mp3))
        d = duration(mp3) + PAD
        wav = os.path.join(WORK, f"v{i}.wav")
        subprocess.run([FFMPEG, "-y", "-loglevel", "error", "-i", mp3, "-af", "apad", "-t", f"{d:.3f}",
                        "-ar", "44100", "-ac", "2", wav], check=True)
        durs.append(d)
        wavs.append(wav)

    lst = os.path.join(WORK, "list.txt")
    with open(lst, "w", encoding="utf-8") as fp:
        fp.writelines(f"file '{w}'\n" for w in wavs)
    audio = os.path.join(WORK, "voice.wav")
    subprocess.run([FFMPEG, "-y", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", lst, "-c", "copy", audio], check=True)

    out = os.path.join(HERE, f"{TITLE}.mp4")
    enc = subprocess.Popen([FFMPEG, "-y", "-loglevel", "error", "-f", "rawvideo", "-pix_fmt", "rgb24",
                            "-s", f"{W}x{H}", "-r", str(FPS), "-i", "-", "-i", audio,
                            "-c:v", "libx264", "-preset", "medium", "-crf", "20", "-pix_fmt", "yuv420p",
                            "-c:a", "aac", "-b:a", "192k", "-shortest", "-movflags", "+faststart", out],
                           stdin=subprocess.PIPE)
    total = sum(durs)
    elapsed = 0.0
    for i, (seg, d) in enumerate(zip(SEGMENTS, durs)):
        print(f"[영상] 장면 {i + 1}/{len(SEGMENTS)}")
        bg, txt = background(seg["c1"], seg["c2"]), text_layer(seg)
        settled = Image.alpha_composite(bg, txt)
        n = round(d * FPS)
        for k in range(n):
            t = k / FPS
            if t < 0.3:  # 글자가 튀어나오는 효과
                p = t / 0.3
                s = 0.7 + 0.3 * (1 - (1 - p) ** 3) + 0.06 * (p * (1 - p)) * 4
                tw, th = int(W * s), int(H * s)
                small = txt.resize((tw, th), Image.BILINEAR)
                frame = bg.copy()
                frame.alpha_composite(small, ((W - tw) // 2, (H - th) // 2))
            else:
                frame = settled.copy()
            # 하단 진행 바
            fd = ImageDraw.Draw(frame)
            prog = (elapsed + t) / total
            fd.rectangle((0, H - 18, W, H), fill=(0, 0, 0, 120))
            fd.rectangle((0, H - 18, int(W * prog), H), fill=(255, 220, 60))
            enc.stdin.write(frame.convert("RGB").tobytes())
        elapsed += d
    enc.stdin.close()
    enc.wait()
    print(f"완료: {out}  ({total:.1f}초)")


if __name__ == "__main__":
    main()
