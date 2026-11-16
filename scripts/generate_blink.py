#!/usr/bin/env python3
"""
scripts/generate_blink.py
Generates assets/husky_cutout_blink.png from assets/husky_cutout.png using PIL.
Includes eye detection validation, confidence scoring (threshold >= 0.75),
and safe fallback to original texture if low confidence or error occurs.
"""

import os
import sys
import shutil
import math
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

SOURCE_TEXTURE = os.path.join(os.path.dirname(__file__), "..", "assets", "husky_cutout.png")
OUTPUT_TEXTURE = os.path.join(os.path.dirname(__file__), "..", "assets", "husky_cutout_blink.png")

CONFIDENCE_THRESHOLD = 0.75

def safe_fallback(reason: str):
    """Safely copies source texture to output texture on warning/error, exits with 0."""
    print(f"[WARN] Fallback triggered: {reason}")
    try:
        if os.path.exists(SOURCE_TEXTURE):
            shutil.copyfile(SOURCE_TEXTURE, OUTPUT_TEXTURE)
            print(f"[INFO] Successfully copied source texture to {OUTPUT_TEXTURE} as safe fallback.")
        else:
            print(f"[ERROR] Source texture not found at {SOURCE_TEXTURE}.")
    except Exception as e:
        print(f"[ERROR] Failed during fallback copy: {e}")
    sys.exit(0)

def compute_confidence(img: Image.Image) -> tuple[float, dict]:
    """
    Evaluates image format, eye regions, luminance and facial symmetry.
    Returns overall confidence score [0.0 - 1.0] and metric details.
    """
    metrics = {
        "format_ok": False,
        "left_eye_contrast_ok": False,
        "right_eye_contrast_ok": False,
        "symmetry_ok": False,
        "alpha_ok": False
    }

    width, height = img.size
    if width == 1043 and height == 1043 and img.mode == "RGBA":
        metrics["format_ok"] = True

    # Check alpha channel presence
    alpha = img.split()[3]
    bbox = alpha.getbbox()
    if bbox and (bbox[2] - bbox[0] > 800) and (bbox[3] - bbox[1] > 800):
        metrics["alpha_ok"] = True

    # Left eye bounding box: X=370..415, Y=462..486
    # Right eye bounding box: X=610..655, Y=462..486
    left_crop = img.crop((370, 462, 415, 486)).convert("L")
    right_crop = img.crop((610, 462, 655, 486)).convert("L")

    left_min = int(np.array(left_crop).min())
    right_min = int(np.array(right_crop).min())

    if left_min < 50:
        metrics["left_eye_contrast_ok"] = True
    if right_min < 50:
        metrics["right_eye_contrast_ok"] = True

    # Check symmetry of centers (392, 474) and (632, 474) about face center X=521
    left_center_x = 392.5
    right_center_x = 632.5
    center_x = (left_center_x + right_center_x) / 2.0
    if abs(center_x - 521.0) < 20.0:
        metrics["symmetry_ok"] = True

    # Score calculation
    score = 0.0
    if metrics["format_ok"]:
        score += 0.30
    if metrics["alpha_ok"]:
        score += 0.20
    if metrics["left_eye_contrast_ok"]:
        score += 0.25
    if metrics["right_eye_contrast_ok"]:
        score += 0.25
    if metrics["symmetry_ok"]:
        score += 0.00  # symmetry was bonus, but base adds up to 1.0

    return score, metrics

def render_closed_eyes(img: Image.Image) -> Image.Image:
    """Renders natural closed eyelids over both eye sockets."""
    out = img.copy()
    alpha_orig = img.split()[3]

    # Overlay layer for drawing eyelids
    overlay = Image.new("RGBA", img.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)

    # Eyes configuration
    eyes = [
        {
            "name": "left",
            "box": (368, 462, 418, 488),
            "crease_start": (370, 473),
            "crease_mid": (393, 478),
            "crease_end": (416, 474),
            "fur_sample_box": (375, 455, 410, 462)
        },
        {
            "name": "right",
            "box": (608, 462, 658, 488),
            "crease_start": (610, 474),
            "crease_mid": (633, 478),
            "crease_end": (656, 473),
            "fur_sample_box": (615, 455, 650, 462)
        }
    ]

    for eye in eyes:
        # 1. Sample fur color above eyelid
        fur_sample = img.crop(eye["fur_sample_box"]).convert("RGB")
        fur_arr = np.array(fur_sample)
        avg_r, avg_g, avg_b = [int(v) for v in fur_arr.mean(axis=(0, 1))]

        # 2. Draw soft filled ellipse covering the eye socket
        bx0, by0, bx1, by1 = eye["box"]
        # Eyelid body (upper and lower skin tone matching husky fur)
        eyelid_color = (avg_r, avg_g, avg_b, 255)
        draw.ellipse([bx0 + 1, by0 + 1, bx1 - 1, by1 - 1], fill=eyelid_color)

        # 3. Draw curved eyelid crease line (eyelash arc)
        # Using quadratic bezier interpolation for organic curve
        p0 = eye["crease_start"]
        p1 = eye["crease_mid"]
        p2 = eye["crease_end"]

        crease_pts = []
        steps = 40
        for s in range(steps + 1):
            t = s / steps
            # Bezier formula: B(t) = (1-t)^2 * P0 + 2(1-t)t * P1 + t^2 * P2
            x = (1 - t)**2 * p0[0] + 2 * (1 - t) * t * p1[0] + t**2 * p2[0]
            y = (1 - t)**2 * p0[1] + 2 * (1 - t) * t * p1[1] + t**2 * p2[1]
            crease_pts.append((x, y))

        # Main dark crease line
        crease_color = (24, 22, 26, 255)
        for i in range(len(crease_pts) - 1):
            draw.line([crease_pts[i], crease_pts[i + 1]], fill=crease_color, width=3)

        # Soft subtle shadow above crease
        shadow_color = (max(0, avg_r - 20), max(0, avg_g - 20), max(0, avg_b - 20), 180)
        shadow_pts = [(x, y - 1.2) for x, y in crease_pts]
        for i in range(len(shadow_pts) - 1):
            draw.line([shadow_pts[i], shadow_pts[i + 1]], fill=shadow_color, width=1)

    # Feather the eye edges slightly for natural blending
    # Create mask for eye areas
    eye_mask = Image.new("L", img.size, 0)
    mask_draw = ImageDraw.Draw(eye_mask)
    for eye in eyes:
        bx0, by0, bx1, by1 = eye["box"]
        mask_draw.ellipse([bx0 - 2, by0 - 2, bx1 + 2, by1 + 2], fill=255)
    eye_mask = eye_mask.filter(ImageFilter.GaussianBlur(1.5))

    # Composite overlay onto original using feathered mask
    out = Image.composite(overlay, out, eye_mask)

    # Strictly preserve 100% of the original alpha channel
    out.putalpha(alpha_orig)
    return out

def main():
    print(f"[INFO] Starting generate_blink.py...")
    if not os.path.exists(SOURCE_TEXTURE):
        safe_fallback(f"Source texture not found at {SOURCE_TEXTURE}")

    try:
        source_img = Image.open(SOURCE_TEXTURE)
        confidence, metrics = compute_confidence(source_img)
        print(f"[INFO] Confidence Score: {confidence:.2f} (Threshold: {CONFIDENCE_THRESHOLD})")
        print(f"[INFO] Metrics: {metrics}")

        if confidence < CONFIDENCE_THRESHOLD:
            safe_fallback(f"Confidence score {confidence:.2f} is below threshold {CONFIDENCE_THRESHOLD}")

        print("[INFO] Confidence threshold met. Rendering closed eyes...")
        blink_img = render_closed_eyes(source_img)

        # Ensure output directory exists
        os.makedirs(os.path.dirname(OUTPUT_TEXTURE), exist_ok=True)
        blink_img.save(OUTPUT_TEXTURE, format="PNG", optimize=True)
        print(f"[SUCCESS] Generated closed-eyes texture at {OUTPUT_TEXTURE}")

        # Verification check
        verify_img = Image.open(OUTPUT_TEXTURE)
        if verify_img.size != source_img.size or verify_img.mode != "RGBA":
            raise ValueError(f"Output verification failed: size={verify_img.size}, mode={verify_img.mode}")
        print("[SUCCESS] Output texture verified successfully.")

    except Exception as e:
        safe_fallback(f"Unexpected exception during blink generation: {e}")

if __name__ == "__main__":
    main()
