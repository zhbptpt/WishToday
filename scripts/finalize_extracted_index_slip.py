from pathlib import Path

from PIL import Image, ImageStat


ROOT = Path(__file__).resolve().parents[1]
SOURCE = (
    ROOT
    / "public"
    / "assets"
    / "notebook"
    / "extracted"
    / "reference-index-slip-transparent.png"
)
DESTINATION = SOURCE.with_name("reference-index-slip-final.png")
REFERENCE_MEAN = (198.0, 158.0, 98.0)


image = Image.open(SOURCE).convert("RGBA")
alpha = image.getchannel("A")
bounds = alpha.getbbox()
if bounds is None:
    raise RuntimeError("No parchment silhouette found")

left, top, right, bottom = bounds
padding = 12
image = image.crop(
    (
        max(0, left - padding),
        max(0, top - padding),
        min(image.width, right + padding),
        min(image.height, bottom + padding),
    )
)

opaque_mask = image.getchannel("A").point(lambda value: 255 if value > 220 else 0)
current_mean = ImageStat.Stat(image.convert("RGB"), opaque_mask).mean
offsets = tuple(
    reference - current
    for current, reference in zip(current_mean, REFERENCE_MEAN)
)

pixels = []
for red, green, blue, alpha_value in image.getdata():
    if alpha_value == 0:
        pixels.append((0, 0, 0, 0))
        continue
    pixels.append(
        (
            max(0, min(255, round(red + offsets[0]))),
            max(0, min(255, round(green + offsets[1]))),
            max(0, min(255, round(blue + offsets[2]))),
            alpha_value,
        )
    )
image.putdata(pixels)
image.thumbnail((1800, 640), Image.Resampling.LANCZOS)
image.save(DESTINATION, optimize=True)
print(DESTINATION)
