#!/usr/bin/env python3
"""Generate a DMG background image with graph visualization."""

import math
import random

# Node type colors from the app
COLORS = [
    '#1a73e8',  # Blue
    '#4285f4',  # Light blue
    '#0f9d58',  # Green
    '#34a853',  # Light green
    '#d93025',  # Red
    '#ea4335',  # Light red
    '#f9a825',  # Yellow
    '#ff8f00',  # Orange
    '#7b1fa2',  # Purple
    '#9c27b0',  # Light purple
    '#00acc1',  # Cyan
    '#00897b',  # Teal
]

WIDTH = 540
HEIGHT = 400

def generate_nodes(count=12):
    """Generate random node positions avoiding center area."""
    nodes = []
    center_x, center_y = WIDTH / 2, HEIGHT / 2

    for i in range(count):
        # Distribute around the edges, avoid center (where icons go)
        angle = (i / count) * 2 * math.pi + random.uniform(-0.2, 0.2)

        # Vary the radius to create depth
        if i % 3 == 0:
            radius = random.uniform(140, 180)
        elif i % 3 == 1:
            radius = random.uniform(100, 140)
        else:
            radius = random.uniform(180, 220)

        x = center_x + radius * math.cos(angle)
        y = center_y + radius * math.sin(angle)

        # Keep within bounds
        x = max(30, min(WIDTH - 30, x))
        y = max(30, min(HEIGHT - 30, y))

        nodes.append({
            'x': x,
            'y': y,
            'r': random.uniform(8, 16),
            'color': COLORS[i % len(COLORS)],
            'opacity': random.uniform(0.4, 0.8)
        })

    return nodes

def generate_edges(nodes):
    """Generate edges between nearby nodes."""
    edges = []
    for i, n1 in enumerate(nodes):
        for j, n2 in enumerate(nodes):
            if i >= j:
                continue
            dist = math.sqrt((n1['x'] - n2['x'])**2 + (n1['y'] - n2['y'])**2)
            # Connect nodes that are reasonably close
            if dist < 150 and random.random() < 0.5:
                edges.append({
                    'x1': n1['x'],
                    'y1': n1['y'],
                    'x2': n2['x'],
                    'y2': n2['y'],
                    'color': n1['color'],
                    'opacity': random.uniform(0.15, 0.3)
                })
    return edges

def generate_svg():
    """Generate the SVG content."""
    random.seed(42)  # Reproducible

    nodes = generate_nodes(14)
    edges = generate_edges(nodes)

    svg = f'''<?xml version="1.0" encoding="UTF-8"?>
<svg width="{WIDTH}" height="{HEIGHT}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="bg" cx="50%" cy="50%" r="70%">
      <stop offset="0%" style="stop-color:#1a1a1a"/>
      <stop offset="100%" style="stop-color:#0d0d0d"/>
    </radialGradient>
    <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation="3" result="blur"/>
      <feMerge>
        <feMergeNode in="blur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
  </defs>

  <!-- Background -->
  <rect width="100%" height="100%" fill="url(#bg)"/>

  <!-- Edges -->
  <g class="edges">
'''

    for edge in edges:
        svg += f'    <line x1="{edge["x1"]:.1f}" y1="{edge["y1"]:.1f}" x2="{edge["x2"]:.1f}" y2="{edge["y2"]:.1f}" stroke="{edge["color"]}" stroke-width="1.5" opacity="{edge["opacity"]:.2f}"/>\n'

    svg += '''  </g>

  <!-- Nodes -->
  <g class="nodes" filter="url(#glow)">
'''

    for node in nodes:
        svg += f'    <circle cx="{node["x"]:.1f}" cy="{node["y"]:.1f}" r="{node["r"]:.1f}" fill="{node["color"]}" opacity="{node["opacity"]:.2f}"/>\n'

    svg += '''  </g>
</svg>'''

    return svg

if __name__ == '__main__':
    svg_content = generate_svg()

    output_path = 'resources/dmg-background.svg'
    with open(output_path, 'w') as f:
        f.write(svg_content)

    print(f'Generated {output_path}')

    # Also try to convert to PNG if possible
    try:
        import subprocess
        png_path = 'resources/dmg-background.png'
        # Try using rsvg-convert or sips
        result = subprocess.run(
            ['sips', '-s', 'format', 'png', output_path, '--out', png_path],
            capture_output=True, text=True
        )
        if result.returncode == 0:
            print(f'Converted to {png_path}')
        else:
            print('Note: Could not convert to PNG automatically')
    except Exception as e:
        print(f'Note: PNG conversion skipped ({e})')
