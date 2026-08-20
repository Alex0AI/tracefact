"""Render a lightweight terminal GIF from TraceFact's real offline report."""

from __future__ import annotations

import json
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
REPORT = ROOT / "demo-output" / "report.json"
OUTPUT = ROOT / "assets" / "terminal-demo.gif"
WIDTH, HEIGHT = 960, 520


def font(size: int, bold: bool = False) -> ImageFont.ImageFont:
    candidates = [
        Path("C:/Windows/Fonts/consolab.ttf" if bold else "C:/Windows/Fonts/consola.ttf"),
        Path("/usr/share/fonts/truetype/dejavu/DejaVuSansMono-Bold.ttf" if bold else "/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf"),
    ]
    for candidate in candidates:
        if candidate.exists():
            return ImageFont.truetype(str(candidate), size)
    return ImageFont.load_default()


def frame(lines: list[tuple[str, str]], cursor: bool = False) -> Image.Image:
    image = Image.new("RGB", (WIDTH, HEIGHT), "#07110f")
    draw = ImageDraw.Draw(image)
    draw.rounded_rectangle((18, 18, WIDTH - 18, HEIGHT - 18), 20, fill="#0b1714", outline="#24423a", width=2)
    draw.rectangle((19, 19, WIDTH - 19, 70), fill="#10201c")
    for x, color in ((45, "#ff6b6b"), (70, "#ffd166"), (95, "#4de3a1")):
        draw.ellipse((x - 7, 37, x + 7, 51), fill=color)
    draw.text((WIDTH // 2 - 86, 32), "tracefact — offline", font=font(17, True), fill="#8ca79f")
    y = 98
    for text, color in lines:
        draw.text((52, y), text, font=font(21, text.startswith("TraceFact")), fill=color)
        y += 42
    if cursor:
        draw.rectangle((52, y + 2, 64, y + 28), fill="#4de3a1")
    return image


def main() -> None:
    report = json.loads(REPORT.read_text(encoding="utf-8"))
    metrics = report["metrics"]
    graph = report["evidenceGraph"]["summary"]
    trace = report["trace"]
    lines = [
        ("PS> tracefact analyze examples/offline-demo.codex.jsonl --out report", "#e8f1ed"),
        (f"TraceFact  adapter={trace['source']['adapter']}  events={metrics['eventCount']}", "#4de3a1"),
        (f"✓ run status: {trace['status']}  ·  findings: {len(report['findings'])}", "#c8f7df"),
        (f"✓ supported claims: {graph['supported']}  ·  evidence coverage: {metrics['evidenceCoverage'] * 100:.0f}%", "#c8f7df"),
        (f"✓ recovery rate: {metrics['recoveryRate'] * 100:.0f}%  ·  reproducibility: {metrics['reproducibility'] * 100:.0f}%", "#c8f7df"),
        ("✓ wrote HTML · JSON · Markdown · SARIF · Replay Capsule", "#7debd1"),
        ("PS> tracefact verify report/run.tracefact.gz", "#e8f1ed"),
        ("OK: capsule hashes match.", "#4de3a1"),
    ]
    frames = [frame(lines[:count], cursor=count < len(lines)) for count in range(1, len(lines) + 1)]
    frames.extend([frames[-1]] * 3)
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    frames[0].save(
        OUTPUT,
        save_all=True,
        append_images=frames[1:],
        duration=[700] * (len(frames) - 4) + [900, 900, 900, 1800],
        loop=0,
        optimize=True,
    )
    print(f"Rendered {OUTPUT.relative_to(ROOT)} from {REPORT.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
