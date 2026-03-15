"""
Discrete Emergence — Canvas Generator (Refined)
A visual artifact expressing the philosophy of intelligence arising from the grid.
Subtle reference: autonomous AI agents emerging from discrete pixel units.
"""

import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter
import math
import os

# Canvas dimensions (300 DPI equivalent for print quality)
W, H = 2400, 3200
MARGIN = 180

# Color palette — severe, intentional
BG = (14, 14, 18)           # Deep graphite
BONE = (230, 226, 218)      # Bone white
ACCENT = (0, 205, 215)      # Electric cyan — trace, pulse, proof of life
ACCENT_DIM = (0, 100, 105)  # Dimmed accent
DIM = (42, 42, 50)          # Subtle grid lines
GHOST = (75, 75, 84)        # Ghost elements
WARM = (175, 165, 148)      # Warm label color
DARK_MARK = (26, 26, 32)    # Dark structural marks

# Seed for reproducibility
rng = np.random.default_rng(42)

img = Image.new("RGB", (W, H), BG)
draw = ImageDraw.Draw(img)

# --- Utility ---
def get_font(size):
    paths = [
        "/System/Library/Fonts/HelveticaNeue.ttc",
        "/System/Library/Fonts/Helvetica.ttc",
        "/Library/Fonts/Arial.ttf",
    ]
    for p in paths:
        if os.path.exists(p):
            try:
                return ImageFont.truetype(p, size)
            except Exception:
                continue
    return ImageFont.load_default()

def get_mono_font(size):
    paths = [
        "/System/Library/Fonts/Menlo.ttc",
        "/System/Library/Fonts/SFNSMono.ttf",
        "/System/Library/Fonts/Monaco.ttf",
    ]
    for p in paths:
        if os.path.exists(p):
            try:
                return ImageFont.truetype(p, size)
            except Exception:
                continue
    return get_font(size)

def get_thin_font(size):
    paths = [
        "/System/Library/Fonts/HelveticaNeue.ttc",
        "/System/Library/Fonts/Helvetica.ttc",
    ]
    for p in paths:
        if os.path.exists(p):
            try:
                return ImageFont.truetype(p, size, index=3)  # Light/Thin variant
            except Exception:
                try:
                    return ImageFont.truetype(p, size)
                except Exception:
                    continue
    return get_font(size)

# Fonts — precision hierarchy
font_label = get_mono_font(13)
font_tiny = get_mono_font(10)
font_micro = get_mono_font(8)
font_large = get_thin_font(78)
font_subtitle = get_thin_font(16)

# ============================================================
# LAYER 1: Substrate — faint dot grid (breathing lattice)
# ============================================================
grid_spacing = 28
for gx in range(MARGIN, W - MARGIN, grid_spacing):
    for gy in range(MARGIN, H - MARGIN, grid_spacing):
        draw.point((gx, gy), fill=(22, 22, 27))

# ============================================================
# LAYER 2: Dense Particle Field — upper region
# "Specimen plate" of discrete units with organic clustering
# ============================================================
field_top = 300
field_bottom = 1380
field_left = MARGIN + 60
field_right = W - MARGIN - 60

unit_size = 5
gap = 4
cols = (field_right - field_left) // (unit_size + gap)
rows = (field_bottom - field_top) // (unit_size + gap)

# Emergence centers — agent clusters
centers = [
    (cols * 0.25, rows * 0.30),
    (cols * 0.72, rows * 0.45),
    (cols * 0.48, rows * 0.68),
    (cols * 0.12, rows * 0.78),
    (cols * 0.82, rows * 0.22),
]

# Render particles
for row in range(rows):
    for col in range(cols):
        x = field_left + col * (unit_size + gap)
        y = field_top + row * (unit_size + gap)

        # Proximity to nearest emergence center
        min_dist = float("inf")
        for cx, cy in centers:
            d = math.sqrt((col - cx) ** 2 + (row - cy) ** 2)
            min_dist = min(min_dist, d)

        # Density gradient: denser near centers
        threshold = 0.12 + 0.88 * (min_dist / (max(cols, rows) * 0.38))

        if rng.random() > threshold:
            if min_dist < 5:
                # Core — pure accent
                color = ACCENT
                sz = unit_size
            elif min_dist < 10:
                # Inner ring — bright transition
                t = (min_dist - 5) / 5
                r = int(0 + t * 140)
                g = int(205 - t * 60)
                b = int(215 - t * 50)
                color = (r, g, b)
                sz = unit_size
            elif min_dist < 20:
                # Outer ring — gray with cyan tint
                intensity = int(150 - min_dist * 4)
                intensity = max(50, intensity)
                color = (intensity, intensity, intensity + 12)
                sz = unit_size
            else:
                # Far field — subtle marks
                intensity = int(65 - min_dist * 0.5)
                intensity = max(28, intensity)
                color = (intensity, intensity, intensity + 4)
                sz = unit_size - 1

            draw.rectangle([x, y, x + sz, y + sz], fill=color)
        elif rng.random() > 0.95:
            # Ghost particles — barely visible
            draw.rectangle([x, y, x + 1, y + 1], fill=(24, 24, 29))

# ============================================================
# LAYER 3: Connection traces — dashed paths between nodes
# ============================================================
for i, (cx1, cy1) in enumerate(centers):
    for j, (cx2, cy2) in enumerate(centers):
        if i >= j:
            continue
        # Only connect nearby pairs
        dist = math.sqrt((cx1 - cx2) ** 2 + (cy1 - cy2) ** 2)
        if dist > cols * 0.55:
            continue

        x1 = int(field_left + cx1 * (unit_size + gap))
        y1 = int(field_top + cy1 * (unit_size + gap))
        x2 = int(field_left + cx2 * (unit_size + gap))
        y2 = int(field_top + cy2 * (unit_size + gap))

        steps = 120
        for s in range(steps):
            t = s / steps
            px = int(x1 + (x2 - x1) * t)
            py = int(y1 + (y2 - y1) * t)
            if s % 5 < 2:
                draw.rectangle([px, py, px + 1, py + 1], fill=ACCENT_DIM)

# ============================================================
# LAYER 4: Reference markers — specimen annotations
# ============================================================
draw.text((MARGIN + 60, field_top - 40), "FIELD 01  —  DISCRETE LATTICE", fill=GHOST, font=font_label)
draw.text((W - MARGIN - 120, field_top - 40), "t₀ → t∞", fill=ACCENT_DIM, font=font_label)
draw.text(
    (MARGIN + 60, field_bottom + 20),
    "n = {:,}  ·  5 emergence nodes  ·  λ = 0.12  ·  δ = 0.38".format(cols * rows),
    fill=(55, 55, 62),
    font=font_tiny,
)

# Thin border around field
draw.rectangle(
    [field_left - 15, field_top - 10, field_right + 15, field_bottom + 10],
    outline=(25, 25, 30),
    width=1,
)

# ============================================================
# LAYER 5: Horizontal rhythm — emergence density waveform
# ============================================================
hist_top = 1520
hist_left = MARGIN + 60
hist_width = W - 2 * MARGIN - 120
bar_h = 2
bar_gap = 6

# Section divider
draw.line([(MARGIN + 60, hist_top - 50), (W - MARGIN - 60, hist_top - 50)], fill=(25, 25, 30), width=1)
draw.text((hist_left, hist_top - 40), "EMERGENCE DENSITY", fill=GHOST, font=font_label)
draw.text((hist_left + hist_width - 90, hist_top - 40), "CYCLE 0042", fill=WARM, font=font_tiny)

for i in range(70):
    y = hist_top + i * (bar_h + bar_gap)
    # Layered wave pattern
    wave1 = math.sin(i * 0.12) * 0.45 + 0.5
    wave2 = math.sin(i * 0.28 + 1.2) * 0.2
    noise = rng.random() * 0.15
    length = int(hist_width * max(0.04, wave1 + wave2 + noise))
    length = min(length, hist_width)

    if 28 <= i <= 35:
        color = ACCENT
        length = min(int(length * 1.2), hist_width)
    elif 24 <= i <= 39:
        t = min(abs(i - 31.5) / 7.5, 1.0)
        r = int(0 + t * 75)
        g = int(205 * (1 - t) + 75 * t)
        b = int(215 * (1 - t) + 84 * t)
        color = (r, g, b)
    else:
        color = DIM

    draw.rectangle([hist_left, y, hist_left + length, y + bar_h], fill=color)

    # Right-aligned value markers for accent bars
    if 28 <= i <= 35:
        draw.text((hist_left + length + 10, y - 3), f"{length / hist_width:.2f}", fill=(55, 55, 62), font=font_micro)

# ============================================================
# LAYER 6: Agent state grid — systematic observation matrix
# ============================================================
state_top = 2180
state_left = MARGIN + 60
cell = 24
cell_gap = 3
state_cols = 35
state_rows = 14

# Section divider
draw.line([(MARGIN + 60, state_top - 50), (W - MARGIN - 60, state_top - 50)], fill=(25, 25, 30), width=1)
draw.text((state_left, state_top - 40), "AGENT LATTICE  —  STATE MAP", fill=GHOST, font=font_label)
draw.text(
    (state_left + 600, state_top - 40),
    f"{state_cols * state_rows} NODES",
    fill=WARM,
    font=font_tiny,
)

for row in range(state_rows):
    for col in range(state_cols):
        x = state_left + col * (cell + cell_gap)
        y = state_top + row * (cell + cell_gap)

        val = rng.random()
        if val > 0.93:
            draw.rectangle([x, y, x + cell, y + cell], fill=ACCENT)
        elif val > 0.78:
            intensity = int(75 + rng.random() * 55)
            draw.rectangle([x, y, x + cell, y + cell], fill=(intensity, intensity, intensity + 8))
        elif val > 0.35:
            draw.rectangle([x, y, x + cell, y + cell], fill=DARK_MARK)
        else:
            draw.rectangle([x, y, x + cell, y + cell], outline=(24, 24, 30))

# Row indices
for row in range(state_rows):
    y = state_top + row * (cell + cell_gap) + 6
    draw.text((state_left - 28, y), f"{row:02d}", fill=(38, 38, 44), font=font_micro)

# Legend
legend_y = state_top + state_rows * (cell + cell_gap) + 25
items = [
    (ACCENT, "EMERGENT"),
    ((110, 110, 118), "PROCESSING"),
    (DARK_MARK, "IDLE"),
    (BG, "VOID"),
]
lx = state_left
for color, label in items:
    draw.rectangle([lx, legend_y, lx + 10, legend_y + 10], fill=color, outline=(40, 40, 46))
    draw.text((lx + 16, legend_y - 1), label, fill=(55, 55, 62), font=font_tiny)
    lx += 130

# ============================================================
# LAYER 7: Title block — sparse, monumental, clinical
# ============================================================
title_y = 2760

# Separator line
draw.line([(MARGIN + 60, title_y - 40), (W - MARGIN - 60, title_y - 40)], fill=(28, 28, 34), width=1)

draw.text((MARGIN + 60, title_y), "DISCRETE", fill=BONE, font=font_large)
draw.text((MARGIN + 60, title_y + 90), "EMERGENCE", fill=ACCENT, font=font_large)

draw.text(
    (MARGIN + 64, title_y + 190),
    "On the self-organization of autonomous units within a finite lattice",
    fill=(65, 65, 72),
    font=font_subtitle,
)

# Plate number — bottom right
draw.text(
    (W - MARGIN - 160, H - MARGIN - 20),
    "PLATE VII  ·  2026",
    fill=(40, 40, 46),
    font=font_tiny,
)

# Bottom left — edition mark
draw.text(
    (MARGIN + 60, H - MARGIN - 20),
    "1/1  ·  PIXEL-AGENT OBSERVATORY",
    fill=(35, 35, 42),
    font=font_tiny,
)

# ============================================================
# LAYER 8: Vertical measurement scale — left edge
# ============================================================
for i in range(MARGIN, H - MARGIN, 160):
    tick_len = 10 if (i - MARGIN) % 320 == 0 else 5
    draw.line([(MARGIN - 25, i), (MARGIN - 25 + tick_len, i)], fill=(35, 35, 42), width=1)
    if (i - MARGIN) % 320 == 0 and i > MARGIN:
        label_val = (i - MARGIN) // 32
        draw.text((MARGIN - 55, i - 5), f"{label_val:02d}", fill=(38, 38, 44), font=font_micro)

# Right edge ticks
for i in range(MARGIN, H - MARGIN, 160):
    tick_len = 10 if (i - MARGIN) % 320 == 0 else 5
    draw.line([(W - MARGIN + 15, i), (W - MARGIN + 15 + tick_len, i)], fill=(35, 35, 42), width=1)

# ============================================================
# REFINEMENT: Soft vignette via numpy (efficient)
# ============================================================
arr = np.array(img, dtype=np.float64)

# Top/bottom vignette
fade_px = 50
for y_edge in range(fade_px):
    factor = y_edge / fade_px
    arr[y_edge, :, :] *= factor
    arr[H - 1 - y_edge, :, :] *= factor

# Left/right subtle vignette
fade_side = 30
for x_edge in range(fade_side):
    factor = 0.7 + 0.3 * (x_edge / fade_side)
    arr[:, x_edge, :] *= factor
    arr[:, W - 1 - x_edge, :] *= factor

arr = np.clip(arr, 0, 255).astype(np.uint8)
img = Image.fromarray(arr)

# ============================================================
# SAVE
# ============================================================
output_path = "/Users/lovelogic/Desktop/Pixel-Agent/discrete-emergence-canvas.png"
img.save(output_path, "PNG", dpi=(300, 300))
print(f"Canvas saved: {output_path}")
print(f"Dimensions: {W}x{H} @ 300 DPI")
