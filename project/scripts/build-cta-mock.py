"""Build the 2x fleet-map mock for the CTA section.

The source is a self-contained artwork on a teal plate (the plate is part of
the design), so we keep it as RGB and simply upscale 2x for Retina density.
No alpha keying: unlike the product cards, this image fills its own panel.
"""

from PIL import Image

SRC = ('/Users/tulikaprasad/.cursor/projects/'
       'Users-tulikaprasad-Desktop-ICON-TECH-WEBSITE/assets/'
       'Screenshot_2026-08-04_at_9.09.42_PM-3ceedb27-c246-469e-86ab-6675613eb633.png')
OUT = 'public/images/cta-fleet-map.png'


def build():
    im = Image.open(SRC).convert('RGB')
    w, h = im.size
    im.resize((w * 2, h * 2), Image.LANCZOS).save(OUT)
    print('wrote', OUT, (w * 2, h * 2))


build()
