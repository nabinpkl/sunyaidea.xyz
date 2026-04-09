import sys

def hex_to_oklch(hex_color):
    hex_color = hex_color.lstrip('#')
    r = int(hex_color[0:2], 16) / 255.0
    g = int(hex_color[2:4], 16) / 255.0
    b = int(hex_color[4:6], 16) / 255.0

    def pivot(c):
        return (c / 12.92) if (c <= 0.04045) else ((c + 0.055) / 1.055)**2.4

    r, g, b = pivot(r), pivot(g), pivot(b)

    x = 0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b
    y = 0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b
    z = 0.0883024619 * r + 0.2817188976 * g + 0.6299787005 * b

    l = (x ** (1/3) + y ** (1/3) + z ** (1/3)) / 3.0 # This is not quite right for OKLCH, but let's use a simpler way or just hex

hex_color = "#202124"
# I will just use hex values in globals.css if OKLCH is not strictly required, 
# but the file uses OKLCH. 
# Actually, Tailwind 4 supports hex in variables.
