from pathlib import Path

from PIL import Image


source = Path("/home/ubuntu/upload/cropped-wajenzi-logo-512.png")
target = Path("/home/ubuntu/webdev-static-assets/wajenzi-official-logo-transparent-cropped.png")

image = Image.open(source).convert("RGBA")
background = image.getpixel((0, 0))[:3]
pixels = image.load()
for y in range(image.height):
    for x in range(image.width):
        red, green, blue, _ = pixels[x, y]
        distance = ((red - background[0]) ** 2 + (green - background[1]) ** 2 + (blue - background[2]) ** 2) ** 0.5
        if distance <= 18:
            pixels[x, y] = (red, green, blue, 0)
        elif distance < 60:
            pixels[x, y] = (red, green, blue, int((distance - 18) / 42 * 255))
        else:
            pixels[x, y] = (red, green, blue, 255)

alpha = image.getchannel("A")
visible_alpha = alpha.point(lambda value: 255 if value > 24 else 0)
bounds = visible_alpha.getbbox()
if bounds is None:
    raise RuntimeError("The official logo has no visible pixels to crop.")

left, top, right, bottom = bounds
padding = 36
left = max(0, left - padding)
top = max(0, top - padding)
right = min(image.width, right + padding)
bottom = min(image.height, bottom + padding)
cropped = image.crop((left, top, right, bottom))
cropped.save(target)
print(f"{target} ({cropped.width}x{cropped.height})")
