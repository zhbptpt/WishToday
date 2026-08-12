from pathlib import Path

from PIL import Image, ImageStat


SOURCES = [
    Path(r"C:\Users\zhb\.codex\generated_images\019fd5bd-d87b-7a21-91bb-a2dc5f6fc61e\exec-3b0b00c8-d50f-4d6f-9d05-e72177b3bf6a.png"),
    Path(r"C:\Users\zhb\.codex\generated_images\019fd5bd-d87b-7a21-91bb-a2dc5f6fc61e\exec-ec017f50-b1e9-4ed1-8aa8-601a8fc672d2.png"),
    Path(r"C:\Users\zhb\.codex\generated_images\019fd5bd-d87b-7a21-91bb-a2dc5f6fc61e\exec-1407cbda-fe3c-4230-b3a6-03a2912ed6a3.png"),
]
OUTPUT_DIR = Path(__file__).resolve().parents[1] / "public" / "assets" / "notebook"


def chroma_alpha(pixel: tuple[int, int, int, int]) -> int:
    red, green, blue, _ = pixel
    magenta_strength = min(red, blue) - green
    if magenta_strength >= 135 and red >= 190 and blue >= 175:
        return 0
    if magenta_strength <= 28:
        return 255
    return round(255 * (135 - magenta_strength) / 107)


def remove_magenta_spill(
    pixel: tuple[int, int, int, int], alpha_value: int
) -> tuple[int, int, int, int]:
    """Recover edge colours that were blended against the magenta key plate."""
    red, green, blue, _ = pixel
    if alpha_value == 0:
        return (0, 0, 0, 0)
    if alpha_value == 255:
        return (red, green, blue, alpha_value)

    coverage = alpha_value / 255
    recovered_red = round((red - 255 * (1 - coverage)) / coverage)
    recovered_green = round(green / coverage)
    recovered_blue = round((blue - 255 * (1 - coverage)) / coverage)
    return (
        max(0, min(255, recovered_red)),
        max(0, min(255, recovered_green)),
        max(0, min(255, recovered_blue)),
        alpha_value,
    )


def opaque_rgb_mean(image: Image.Image) -> tuple[float, float, float]:
    opaque_mask = image.getchannel("A").point(lambda value: 255 if value > 220 else 0)
    return tuple(ImageStat.Stat(image.convert("RGB"), opaque_mask).mean)


def match_colour_reference(
    image: Image.Image, reference_mean: tuple[float, float, float]
) -> Image.Image:
    current_mean = opaque_rgb_mean(image)
    offsets = tuple(
        reference - current
        for current, reference in zip(current_mean, reference_mean)
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
    matched = Image.new("RGBA", image.size)
    matched.putdata(pixels)
    return matched


def prepare(source: Path) -> Image.Image:
    image = Image.open(source).convert("RGBA")
    alpha = Image.new("L", image.size)
    source_pixels = list(image.getdata())
    alpha_values = [chroma_alpha(pixel) for pixel in source_pixels]
    alpha.putdata(alpha_values)
    image.putdata(
        [
            remove_magenta_spill(pixel, alpha_value)
            for pixel, alpha_value in zip(source_pixels, alpha_values)
        ]
    )

    bounds = alpha.getbbox()
    if bounds is None:
        raise RuntimeError(f"No parchment found in {source}")

    left, top, right, bottom = bounds
    padding = 12
    crop = image.crop(
        (
            max(0, left - padding),
            max(0, top - padding),
            min(image.width, right + padding),
            min(image.height, bottom + padding),
        )
    )
    crop.thumbnail((1600, 420), Image.Resampling.LANCZOS)
    return crop


OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
prepared = [prepare(source) for source in SOURCES]
reference_mean = opaque_rgb_mean(prepared[2])
for index, image in enumerate(prepared, start=1):
    if index < 3:
        image = match_colour_reference(image, reference_mean)
    image.save(
        OUTPUT_DIR / f"antique-index-slip-torn-v{index}.png",
        optimize=True,
    )
