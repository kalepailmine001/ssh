#!/usr/bin/env python3
"""
Simple script to create basic extension icons using PIL
Run: python3 create_icons.py
"""
from PIL import Image, ImageDraw, ImageFont
import os

def create_icon(size, filename):
    # Create a new image with a gradient background
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    
    # Create gradient background
    for i in range(size):
        color = (66 + i // 3, 133 + i // 6, 244, 255)  # Blue gradient
        draw.rectangle([0, i, size, i+1], fill=color)
    
    # Draw key icon
    key_color = (255, 255, 255, 255)  # White
    
    # Key shaft
    shaft_width = size // 8
    shaft_height = size // 3
    shaft_x = size // 4
    shaft_y = size // 2 - shaft_height // 2
    draw.rectangle([shaft_x, shaft_y, shaft_x + shaft_width, shaft_y + shaft_height], fill=key_color)
    
    # Key head (circle)
    head_radius = size // 6
    head_x = shaft_x - head_radius
    head_y = size // 2 - head_radius
    draw.ellipse([head_x, head_y, head_x + head_radius * 2, head_y + head_radius * 2], fill=key_color)
    
    # Key teeth
    tooth_size = size // 16
    for i in range(2):
        tooth_x = shaft_x + shaft_width
        tooth_y = shaft_y + shaft_height // 3 + i * tooth_size * 2
        draw.rectangle([tooth_x, tooth_y, tooth_x + tooth_size, tooth_y + tooth_size], fill=key_color)
    
    img.save(filename, 'PNG')
    print(f"Created {filename}")

if __name__ == "__main__":
    # Create icons directory if it doesn't exist
    os.makedirs('icons', exist_ok=True)
    
    # Create different sized icons
    sizes = [16, 32, 48, 128]
    for size in sizes:
        create_icon(size, f'icons/icon{size}.png')
    
    print("All icons created successfully!")
