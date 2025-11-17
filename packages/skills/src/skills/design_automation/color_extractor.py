"""
Color extraction and palette generation utilities
"""
import colorsys
import logging
from typing import List, Dict, Tuple, Optional
from PIL import Image
from io import BytesIO
import requests
from colorthief import ColorThief
import math

from .models import ColorScale, ColorSystem

logger = logging.getLogger(__name__)


class ColorExtractor:
    """Extract and generate comprehensive color palettes"""

    def __init__(self):
        """Initialize color extractor"""
        self.session = requests.Session()

    def extract_from_image(self, image_path: str) -> List[str]:
        """
        Extract dominant colors from an image

        Args:
            image_path: Path or URL to image

        Returns:
            List of hex color codes
        """
        try:
            if image_path.startswith('http'):
                response = self.session.get(image_path)
                img = Image.open(BytesIO(response.content))
            else:
                img = Image.open(image_path)

            # Convert RGBA to RGB if necessary
            if img.mode == 'RGBA':
                background = Image.new('RGB', img.size, (255, 255, 255))
                background.paste(img, mask=img.split()[3])
                img = background

            # Save to BytesIO for ColorThief
            img_io = BytesIO()
            img.save(img_io, 'JPEG', quality=95)
            img_io.seek(0)

            # Extract colors with ColorThief
            color_thief = ColorThief(img_io)
            palette = color_thief.get_palette(color_count=10, quality=1)

            # Convert to hex
            colors = []
            for rgb in palette:
                hex_color = '#{:02x}{:02x}{:02x}'.format(rgb[0], rgb[1], rgb[2])
                colors.append(hex_color.upper())

            return colors

        except Exception as e:
            logger.error(f"Error extracting colors from image: {e}")
            return self._get_default_colors()

    def generate_color_scale(self, base_color: str, name: str = "color") -> ColorScale:
        """
        Generate a complete color scale (50-900) from a base color

        Args:
            base_color: Base hex color
            name: Name for the color scale

        Returns:
            ColorScale with all shades
        """
        scale = {}

        # Parse base color
        rgb = self._hex_to_rgb(base_color)
        hsl = self._rgb_to_hsl(rgb)

        # Define shade mappings (lightness values)
        shades = {
            '50': 0.95,
            '100': 0.90,
            '200': 0.80,
            '300': 0.70,
            '400': 0.60,
            '500': 0.50,  # Base color
            '600': 0.40,
            '700': 0.30,
            '800': 0.20,
            '900': 0.10,
            '950': 0.05
        }

        for shade, lightness in shades.items():
            # Adjust lightness while maintaining hue and slight saturation adjustment
            h = hsl[0]
            s = hsl[1] * (0.8 + (0.4 * (1 - lightness)))  # Reduce saturation at extremes
            l = lightness

            # Convert back to hex
            rgb_shade = self._hsl_to_rgb((h, s, l))
            hex_shade = self._rgb_to_hex(rgb_shade)
            scale[shade] = hex_shade

        return ColorScale(
            name=name,
            base=base_color,
            scale=scale
        )

    def generate_neutral_scale(self, base_color: Optional[str] = None) -> ColorScale:
        """
        Generate a neutral/gray scale

        Args:
            base_color: Optional base color to derive neutral from

        Returns:
            ColorScale for neutrals
        """
        if base_color:
            # Derive neutral from base color with reduced saturation
            rgb = self._hex_to_rgb(base_color)
            hsl = self._rgb_to_hsl(rgb)
            # Keep slight hue but minimal saturation
            base_neutral = self._hsl_to_rgb((hsl[0], 0.05, 0.50))
            base_hex = self._rgb_to_hex(base_neutral)
        else:
            base_hex = "#6B7280"

        return self.generate_color_scale(base_hex, "neutral")

    def create_color_system(self,
                          primary: str,
                          secondary: Optional[str] = None,
                          accent: Optional[str] = None,
                          brand_colors: Optional[Dict[str, str]] = None) -> ColorSystem:
        """
        Create a complete color system with semantic colors

        Args:
            primary: Primary brand color
            secondary: Optional secondary color
            accent: Optional accent color
            brand_colors: Additional brand colors

        Returns:
            Complete ColorSystem
        """
        # Generate primary scale
        primary_scale = self.generate_color_scale(primary, "primary")

        # Generate secondary scale if provided
        secondary_scale = None
        if secondary:
            secondary_scale = self.generate_color_scale(secondary, "secondary")
        else:
            # Generate complementary color
            secondary_color = self._generate_complementary(primary)
            secondary_scale = self.generate_color_scale(secondary_color, "secondary")

        # Generate accent scale if provided
        accent_scale = None
        if accent:
            accent_scale = self.generate_color_scale(accent, "accent")
        else:
            # Generate triadic color for accent
            accent_color = self._generate_triadic(primary)
            accent_scale = self.generate_color_scale(accent_color, "accent")

        # Generate neutral scale
        neutral_scale = self.generate_neutral_scale(primary)

        # Create semantic colors
        semantic = {
            'success': '#10B981',
            'warning': '#F59E0B',
            'error': '#EF4444',
            'info': '#3B82F6',
            'background': '#FFFFFF',
            'surface': neutral_scale.scale['50'],
            'text': neutral_scale.scale['900'],
            'textMuted': neutral_scale.scale['600'],
            'border': neutral_scale.scale['200'],
            'divider': neutral_scale.scale['100']
        }

        # Merge with brand colors
        brand = brand_colors.copy() if brand_colors else {}
        brand['primary'] = primary
        if secondary:
            brand['secondary'] = secondary
        if accent:
            brand['accent'] = accent

        return ColorSystem(
            primary=primary_scale,
            secondary=secondary_scale,
            accent=accent_scale,
            neutral=neutral_scale,
            semantic=semantic,
            brand=brand
        )

    def merge_with_branding(self,
                           moodboard_colors: List[str],
                           brand_colors: Optional[Dict[str, str]] = None) -> Dict[str, str]:
        """
        Merge moodboard colors with brand colors (brand takes precedence)

        Args:
            moodboard_colors: Colors extracted from moodboard
            brand_colors: Brand color definitions

        Returns:
            Merged color palette
        """
        palette = {}

        # Start with moodboard colors
        if moodboard_colors:
            palette['primary'] = moodboard_colors[0] if moodboard_colors else '#3B82F6'
            if len(moodboard_colors) > 1:
                palette['secondary'] = moodboard_colors[1]
            if len(moodboard_colors) > 2:
                palette['accent'] = moodboard_colors[2]

        # Override with brand colors
        if brand_colors:
            palette.update(brand_colors)

        # Ensure minimum colors
        if 'primary' not in palette:
            palette['primary'] = '#3B82F6'
        if 'background' not in palette:
            palette['background'] = '#FFFFFF'
        if 'text' not in palette:
            palette['text'] = '#1F2937'

        return palette

    def _hex_to_rgb(self, hex_color: str) -> Tuple[int, int, int]:
        """Convert hex to RGB"""
        hex_color = hex_color.lstrip('#')
        return tuple(int(hex_color[i:i+2], 16) for i in (0, 2, 4))

    def _rgb_to_hex(self, rgb: Tuple[int, int, int]) -> str:
        """Convert RGB to hex"""
        return '#{:02x}{:02x}{:02x}'.format(
            max(0, min(255, int(rgb[0]))),
            max(0, min(255, int(rgb[1]))),
            max(0, min(255, int(rgb[2])))
        ).upper()

    def _rgb_to_hsl(self, rgb: Tuple[int, int, int]) -> Tuple[float, float, float]:
        """Convert RGB to HSL"""
        r, g, b = [x / 255.0 for x in rgb]
        h, l, s = colorsys.rgb_to_hls(r, g, b)
        return (h, s, l)

    def _hsl_to_rgb(self, hsl: Tuple[float, float, float]) -> Tuple[int, int, int]:
        """Convert HSL to RGB"""
        h, s, l = hsl
        r, g, b = colorsys.hls_to_rgb(h, l, s)
        return (int(r * 255), int(g * 255), int(b * 255))

    def _generate_complementary(self, hex_color: str) -> str:
        """Generate complementary color"""
        rgb = self._hex_to_rgb(hex_color)
        hsl = self._rgb_to_hsl(rgb)

        # Rotate hue by 180 degrees
        new_hue = (hsl[0] + 0.5) % 1.0
        new_hsl = (new_hue, hsl[1], hsl[2])

        rgb_comp = self._hsl_to_rgb(new_hsl)
        return self._rgb_to_hex(rgb_comp)

    def _generate_triadic(self, hex_color: str) -> str:
        """Generate triadic color (120 degrees rotation)"""
        rgb = self._hex_to_rgb(hex_color)
        hsl = self._rgb_to_hsl(rgb)

        # Rotate hue by 120 degrees
        new_hue = (hsl[0] + 0.333) % 1.0
        new_hsl = (new_hue, hsl[1] * 0.9, hsl[2] * 0.95)  # Slightly adjust saturation and lightness

        rgb_triadic = self._hsl_to_rgb(new_hsl)
        return self._rgb_to_hex(rgb_triadic)

    def _generate_analogous(self, hex_color: str, offset: float = 0.083) -> List[str]:
        """Generate analogous colors (adjacent on color wheel)"""
        rgb = self._hex_to_rgb(hex_color)
        hsl = self._rgb_to_hsl(rgb)

        colors = []
        for i in [-2, -1, 0, 1, 2]:
            new_hue = (hsl[0] + (offset * i)) % 1.0
            new_hsl = (new_hue, hsl[1], hsl[2])
            rgb_analog = self._hsl_to_rgb(new_hsl)
            colors.append(self._rgb_to_hex(rgb_analog))

        return colors

    def _get_default_colors(self) -> List[str]:
        """Return default color palette"""
        return [
            '#3B82F6',  # Blue
            '#10B981',  # Green
            '#F59E0B',  # Amber
            '#EF4444',  # Red
            '#8B5CF6',  # Purple
            '#EC4899',  # Pink
            '#14B8A6',  # Teal
            '#F97316',  # Orange
            '#6B7280',  # Gray
            '#1F2937'   # Dark
        ]

    def analyze_color_harmony(self, colors: List[str]) -> str:
        """
        Analyze the harmony type of a color palette

        Args:
            colors: List of hex colors

        Returns:
            Harmony type description
        """
        if len(colors) < 2:
            return "monochromatic"

        # Convert to HSL for analysis
        hsls = [self._rgb_to_hsl(self._hex_to_rgb(c)) for c in colors[:3]]

        # Check hue differences
        hue_diffs = []
        for i in range(len(hsls) - 1):
            diff = abs(hsls[i][0] - hsls[i+1][0])
            if diff > 0.5:
                diff = 1.0 - diff
            hue_diffs.append(diff)

        avg_diff = sum(hue_diffs) / len(hue_diffs) if hue_diffs else 0

        if avg_diff < 0.1:
            return "monochromatic"
        elif 0.45 < avg_diff < 0.55:
            return "complementary"
        elif 0.28 < avg_diff < 0.38:
            return "triadic"
        elif avg_diff < 0.2:
            return "analogous"
        else:
            return "custom"