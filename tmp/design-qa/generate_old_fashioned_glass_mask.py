from pathlib import Path

from PIL import Image, ImageChops, ImageDraw, ImageFilter


workspace = Path(__file__).resolve().parents[2]
source_path = workspace / "public" / "mock" / "cocktails" / "old-fashioned.png"
output_path = (
    workspace
    / "public"
    / "assets"
    / "ink-wash"
    / "old-fashioned-glass-mask-v1.png"
)
wash_output_path = (
    workspace
    / "public"
    / "assets"
    / "ink-wash"
    / "old-fashioned-background-wash-v1.png"
)

with Image.open(source_path) as source:
    width, height = source.size
    # Keep the original photograph as the source of truth, but dissolve the
    # bar shelves and furniture so the background reads as a gradual wash.
    background_wash = source.convert("RGB").filter(
        ImageFilter.GaussianBlur(radius=56)
    )

if (width, height) != (1536, 1024):
    raise RuntimeError(f"Unexpected Old Fashioned source size: {width}x{height}")

subject_alpha = Image.new("L", (width, height), 0)
draw = ImageDraw.Draw(subject_alpha)

# Preserve the complete real glass, rim, peel, ice, stemless body, and base.
# The separate wide wash layer supplies the irregular rectangular photo trace.
draw.ellipse((736, 256, 1212, 400), fill=255)
draw.polygon(
    [
        (738, 330),
        (756, 302),
        (802, 280),
        (866, 266),
        (1068, 266),
        (1152, 282),
        (1194, 308),
        (1210, 340),
        (1199, 596),
        (1182, 788),
        (1150, 844),
        (1106, 876),
        (852, 876),
        (802, 856),
        (772, 814),
        (756, 652),
    ],
    fill=255,
)

# A broader feather keeps the photographed rim and glass facets intact while
# dissolving their outside edge into the warm archival wash.
subject_alpha = subject_alpha.filter(ImageFilter.GaussianBlur(radius=12))

# Retain the photographed grounding shadow at reduced strength so the glass
# does not float. Build it on a separate layer: drawing it over the subject
# would replace the opaque lower glass with the shadow's lower alpha.
shadow_alpha = Image.new("L", (width, height), 0)
shadow_draw = ImageDraw.Draw(shadow_alpha)
shadow_draw.ellipse((770, 812, 1192, 936), fill=66)
shadow_alpha = shadow_alpha.filter(ImageFilter.GaussianBlur(radius=26))

alpha = ImageChops.lighter(subject_alpha, shadow_alpha)

rgba = Image.new("RGBA", (width, height), (255, 255, 255, 0))
rgba.putalpha(alpha)
output_path.parent.mkdir(parents=True, exist_ok=True)
rgba.save(output_path, optimize=True)
background_wash.save(wash_output_path, optimize=True)
