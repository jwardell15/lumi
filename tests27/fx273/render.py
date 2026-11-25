# Renders the 27.3 test fixtures: a replica of Joe's example label, plus rotated / blurred / phone-like variants.
from playwright.sync_api import sync_playwright
from PIL import Image, ImageFilter, ImageEnhance
import os; D = os.path.dirname(os.path.abspath(__file__))
with sync_playwright() as p:
    b = p.chromium.launch(); pg = b.new_page(viewport={'width': 1000, 'height': 1000})
    pg.goto('file://' + D + '/label.html'); pg.screenshot(path=D + '/label-caffeinated.png'); b.close()
im = Image.open(D + '/label-caffeinated.png').convert('RGB')
im.rotate(90, expand=True, fillcolor=(246, 236, 214)).save(D + '/label-rot90.png')
im.rotate(-7, expand=True, fillcolor=(246, 236, 214), resample=Image.BICUBIC).save(D + '/label-tilt7.png')
im.resize((700, 700)).filter(ImageFilter.GaussianBlur(1.6)).save(D + '/label-blur.jpg', quality=70)
ImageEnhance.Brightness(im.resize((800, 800))).enhance(0.8).save(D + '/label-dim.jpg', quality=60)
im.crop((0, 0, 520, 1000)).save(D + '/label-ingonly.png'); im.crop((500, 0, 1000, 1000)).save(D + '/label-nfonly.png')
print('ok')
