from pathlib import Path

from PIL import Image, ImageStat


ROOT = Path(__file__).resolve().parents[1]
ASSET_DIR = ROOT / "public" / "assets" / "notebook"
REFERENCE = ASSET_DIR / "extracted" / "reference-index-slip-final.png"
SOURCES = tuple(ASSET_DIR / f"antique-index-slip-torn-v{index}.png" for index in range(1, 4))


def opaque_mask(image: Image.Image) -> Image.Image:
    return image.getchannel("A").point(lambda value: 255 if value > 220 else 0)


reference = Image.open(REFERENCE).convert("RGBA")
reference_mean = ImageStat.Stat(reference.convert("RGB"), opaque_mask(reference)).mean

for source in SOURCES:
    image = Image.open(source).convert("RGBA")
    current_mean = ImageStat.Stat(image.convert("RGB"), opaque_mask(image)).mean
    offsets = tuple(target - current for current, target in zip(current_mean, reference_mean))

    recolored = []
    for red, green, blue, alpha in image.getdata():
        if alpha == 0:
            recolored.append((0, 0, 0, 0))
            continue
        recolored.append(
            (
                max(0, min(255, round(red + offsets[0]))),
                max(0, min(255, round(green + offsets[1]))),
                max(0, min(255, round(blue + offsets[2]))),
                alpha,
            )
        )

    image.putdata(recolored)
    destination = source.with_name(f"{source.stem}-reference-tone.png")
    image.save(destination, optimize=True)
    result_mean = ImageStat.Stat(image.convert("RGB"), opaque_mask(image)).mean
    print(destination)
    print("mean:", tuple(round(value, 2) for value in result_mean))
