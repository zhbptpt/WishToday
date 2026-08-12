from pathlib import Path
import unittest

from PIL import Image, ImageStat


ASSET_DIR = (
    Path(__file__).resolve().parents[1] / "public" / "assets" / "notebook"
)


def opaque_rgb_mean(path: Path) -> tuple[float, float, float]:
    image = Image.open(path).convert("RGBA")
    opaque_mask = image.getchannel("A").point(lambda value: 255 if value > 220 else 0)
    return tuple(ImageStat.Stat(image.convert("RGB"), opaque_mask).mean)


class NotebookSlipColourTest(unittest.TestCase):
    def test_all_slips_match_the_third_slip_colour_reference(self) -> None:
        reference = opaque_rgb_mean(ASSET_DIR / "antique-index-slip-torn-v3.png")

        for index in (1, 2):
            with self.subTest(index=index):
                candidate = opaque_rgb_mean(
                    ASSET_DIR / f"antique-index-slip-torn-v{index}.png"
                )
                for actual, expected in zip(candidate, reference):
                    self.assertAlmostEqual(actual, expected, delta=3.0)


if __name__ == "__main__":
    unittest.main()
