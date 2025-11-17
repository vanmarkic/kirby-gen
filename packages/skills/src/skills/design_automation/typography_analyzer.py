"""
Typography analysis and font pairing suggestions
"""
import logging
from typing import List, Dict, Tuple, Optional
from .models import FontStyle, TypographyScale

logger = logging.getLogger(__name__)


class TypographyAnalyzer:
    """Analyze and suggest typography systems"""

    # Google Fonts database with categories and characteristics
    GOOGLE_FONTS = {
        'serif': {
            'classic': ['Merriweather', 'Playfair Display', 'Lora', 'Crimson Text', 'EB Garamond'],
            'modern': ['Abril Fatface', 'Rozha One', 'Yeseva One', 'Cormorant Garamond'],
            'readable': ['Source Serif Pro', 'IBM Plex Serif', 'Bitter', 'Roboto Slab']
        },
        'sans-serif': {
            'clean': ['Inter', 'Roboto', 'Open Sans', 'Lato', 'Poppins'],
            'geometric': ['Montserrat', 'Raleway', 'Nunito', 'Quicksand', 'Comfortaa'],
            'humanist': ['Source Sans Pro', 'Cabin', 'Karla', 'Work Sans', 'Rubik'],
            'technical': ['IBM Plex Sans', 'Barlow', 'Exo 2', 'Titillium Web', 'Oxygen']
        },
        'display': {
            'bold': ['Bebas Neue', 'Anton', 'Archivo Black', 'Oswald', 'Teko'],
            'elegant': ['Bodoni Moda', 'Cinzel', 'Abril Fatface', 'Josefin Sans'],
            'playful': ['Fredoka One', 'Pacifico', 'Lobster', 'Comfortaa', 'Bubblegum Sans'],
            'modern': ['Space Grotesk', 'Syne', 'DM Sans', 'Epilogue', 'Outfit']
        },
        'mono': {
            'code': ['Fira Code', 'JetBrains Mono', 'Source Code Pro', 'IBM Plex Mono', 'Roboto Mono'],
            'retro': ['Space Mono', 'Courier Prime', 'VT323', 'Major Mono Display']
        }
    }

    # Font pairing rules
    PAIRING_RULES = {
        ('serif', 'sans-serif'): 0.9,  # Classic pairing
        ('sans-serif', 'serif'): 0.9,
        ('display', 'sans-serif'): 0.85,  # Good for headings
        ('display', 'serif'): 0.8,
        ('sans-serif', 'sans-serif'): 0.7,  # Can work with contrast
        ('serif', 'serif'): 0.6,  # Harder to pull off
        ('mono', 'sans-serif'): 0.7,  # Technical feel
        ('mono', 'serif'): 0.5
    }

    def __init__(self):
        """Initialize typography analyzer"""
        pass

    def analyze_mood_typography(self, mood: List[str], keywords: List[str]) -> Dict[str, str]:
        """
        Suggest typography based on mood and keywords

        Args:
            mood: List of mood descriptors
            keywords: Design keywords

        Returns:
            Typography suggestions
        """
        suggestions = {
            'heading_style': 'sans-serif',
            'body_style': 'sans-serif',
            'heading_suggestions': [],
            'body_suggestions': []
        }

        combined_terms = [term.lower() for term in mood + keywords]

        # Determine heading style
        if any(term in combined_terms for term in ['elegant', 'sophisticated', 'luxury', 'classic']):
            suggestions['heading_style'] = 'serif'
            suggestions['heading_suggestions'] = self.GOOGLE_FONTS['serif']['classic']
        elif any(term in combined_terms for term in ['bold', 'modern', 'tech', 'futuristic']):
            suggestions['heading_style'] = 'display'
            suggestions['heading_suggestions'] = self.GOOGLE_FONTS['display']['bold']
        elif any(term in combined_terms for term in ['playful', 'fun', 'creative', 'artistic']):
            suggestions['heading_style'] = 'display'
            suggestions['heading_suggestions'] = self.GOOGLE_FONTS['display']['playful']
        else:
            suggestions['heading_style'] = 'sans-serif'
            suggestions['heading_suggestions'] = self.GOOGLE_FONTS['sans-serif']['clean']

        # Determine body style based on heading
        if suggestions['heading_style'] == 'serif':
            suggestions['body_style'] = 'sans-serif'
            suggestions['body_suggestions'] = self.GOOGLE_FONTS['sans-serif']['clean']
        elif suggestions['heading_style'] == 'display':
            suggestions['body_style'] = 'sans-serif'
            suggestions['body_suggestions'] = self.GOOGLE_FONTS['sans-serif']['humanist']
        else:
            # Sans-serif heading, consider serif body for contrast
            if any(term in combined_terms for term in ['editorial', 'magazine', 'blog']):
                suggestions['body_style'] = 'serif'
                suggestions['body_suggestions'] = self.GOOGLE_FONTS['serif']['readable']
            else:
                suggestions['body_style'] = 'sans-serif'
                suggestions['body_suggestions'] = self.GOOGLE_FONTS['sans-serif']['clean']

        return suggestions

    def generate_font_pairings(self,
                              primary_font: Optional[str] = None,
                              style_preference: Optional[str] = None) -> List[Tuple[str, str]]:
        """
        Generate font pairings based on preferences

        Args:
            primary_font: Primary font if specified
            style_preference: Style preference (modern, classic, playful, etc.)

        Returns:
            List of font pairing tuples (heading, body)
        """
        pairings = []

        if primary_font:
            # Find complementary fonts for the given primary
            category = self._identify_font_category(primary_font)
            if category:
                pairings.extend(self._get_complementary_fonts(primary_font, category))
        else:
            # Generate pairings based on style
            if style_preference == 'modern':
                pairings.extend([
                    ('Inter', 'Inter'),
                    ('Montserrat', 'Source Sans Pro'),
                    ('Poppins', 'Roboto'),
                    ('Space Grotesk', 'IBM Plex Sans'),
                    ('DM Sans', 'Work Sans')
                ])
            elif style_preference == 'classic':
                pairings.extend([
                    ('Playfair Display', 'Lora'),
                    ('Merriweather', 'Open Sans'),
                    ('Crimson Text', 'Roboto'),
                    ('EB Garamond', 'Source Sans Pro'),
                    ('Cormorant Garamond', 'Karla')
                ])
            elif style_preference == 'playful':
                pairings.extend([
                    ('Fredoka One', 'Nunito'),
                    ('Pacifico', 'Open Sans'),
                    ('Lobster', 'Roboto'),
                    ('Comfortaa', 'Comfortaa'),
                    ('Bubblegum Sans', 'Quicksand')
                ])
            else:
                # Default balanced pairings
                pairings.extend([
                    ('Roboto', 'Roboto'),
                    ('Inter', 'Inter'),
                    ('Open Sans', 'Open Sans'),
                    ('Playfair Display', 'Source Sans Pro'),
                    ('Montserrat', 'Lato')
                ])

        return pairings[:5]  # Return top 5 pairings

    def create_typography_scale(self,
                               heading_font: str,
                               body_font: str,
                               base_size: int = 16,
                               scale_ratio: float = 1.25) -> TypographyScale:
        """
        Create a complete typography scale

        Args:
            heading_font: Font for headings
            body_font: Font for body text
            base_size: Base font size in pixels
            scale_ratio: Scale ratio for sizing

        Returns:
            Complete TypographyScale
        """
        # Determine font styles
        heading_style = self._get_font_style(heading_font)
        body_style = self._get_font_style(body_font)

        # Generate size scale
        sizes = self._generate_size_scale(base_size, scale_ratio)

        # Define font families
        font_families = {
            'heading': f"'{heading_font}', {self._get_fallback(heading_style)}",
            'body': f"'{body_font}', {self._get_fallback(body_style)}",
            'mono': "'Fira Code', 'Courier New', monospace"
        }

        # Define weights
        weights = {
            'thin': 100,
            'light': 300,
            'regular': 400,
            'medium': 500,
            'semibold': 600,
            'bold': 700,
            'extrabold': 800,
            'black': 900
        }

        # Define line heights
        line_heights = {
            'tight': 1.1,
            'snug': 1.25,
            'normal': 1.5,
            'relaxed': 1.625,
            'loose': 1.75,
            'body': 1.6,
            'heading': 1.2
        }

        return TypographyScale(
            heading_style=FontStyle(heading_style),
            body_style=FontStyle(body_style),
            scale_ratio=scale_ratio,
            base_size=base_size,
            font_families=font_families,
            sizes=sizes,
            weights=weights,
            line_heights=line_heights
        )

    def _identify_font_category(self, font_name: str) -> Optional[Tuple[str, str]]:
        """Identify the category of a font"""
        for main_cat, subcats in self.GOOGLE_FONTS.items():
            for subcat, fonts in subcats.items():
                if font_name in fonts:
                    return (main_cat, subcat)
        return None

    def _get_complementary_fonts(self, font: str, category: Tuple[str, str]) -> List[Tuple[str, str]]:
        """Get complementary fonts for pairing"""
        pairings = []
        main_cat, subcat = category

        # Find complementary categories
        if main_cat == 'serif':
            # Pair with sans-serif
            for sans_fonts in self.GOOGLE_FONTS['sans-serif'].values():
                for sans_font in sans_fonts[:2]:
                    pairings.append((font, sans_font))
        elif main_cat == 'sans-serif':
            # Can pair with serif or another sans
            for serif_fonts in self.GOOGLE_FONTS['serif'].values():
                for serif_font in serif_fonts[:1]:
                    pairings.append((serif_font, font))
            # Or with contrasting sans
            if subcat == 'geometric':
                pairings.extend([(font, f) for f in self.GOOGLE_FONTS['sans-serif']['humanist'][:2]])
        elif main_cat == 'display':
            # Pair with clean sans or readable serif
            for body_font in self.GOOGLE_FONTS['sans-serif']['clean'][:3]:
                pairings.append((font, body_font))

        return pairings[:5]

    def _get_font_style(self, font_name: str) -> str:
        """Determine the style category of a font"""
        category = self._identify_font_category(font_name)
        if category:
            return category[0]

        # Check by name patterns
        if any(keyword in font_name.lower() for keyword in ['serif', 'garamond', 'times']):
            return 'serif'
        elif any(keyword in font_name.lower() for keyword in ['mono', 'code', 'courier']):
            return 'mono'
        elif any(keyword in font_name.lower() for keyword in ['display', 'headline']):
            return 'display'
        else:
            return 'sans-serif'

    def _get_fallback(self, style: str) -> str:
        """Get fallback fonts for a style"""
        fallbacks = {
            'serif': "Georgia, 'Times New Roman', serif",
            'sans-serif': "-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif",
            'display': "-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif",
            'mono': "'Courier New', Courier, monospace"
        }
        return fallbacks.get(style, fallbacks['sans-serif'])

    def _generate_size_scale(self, base: int, ratio: float) -> Dict[str, str]:
        """Generate typography size scale"""
        sizes = {
            'xs': f"{int(base / (ratio * ratio))}px",
            'sm': f"{int(base / ratio)}px",
            'base': f"{base}px",
            'lg': f"{int(base * ratio)}px",
            'xl': f"{int(base * ratio * ratio)}px",
            '2xl': f"{int(base * ratio * ratio * ratio)}px",
            '3xl': f"{int(base * ratio * ratio * ratio * ratio)}px",
            '4xl': f"{int(base * ratio * ratio * ratio * ratio * ratio)}px",
            '5xl': f"{int(base * ratio * ratio * ratio * ratio * ratio * ratio)}px"
        }

        # Add semantic sizes
        sizes.update({
            'h1': sizes['4xl'],
            'h2': sizes['3xl'],
            'h3': sizes['2xl'],
            'h4': sizes['xl'],
            'h5': sizes['lg'],
            'h6': sizes['base'],
            'body': sizes['base'],
            'small': sizes['sm'],
            'tiny': sizes['xs']
        })

        return sizes

    def suggest_font_stack(self, primary_font: str, category: str = 'sans-serif') -> str:
        """
        Generate a complete font stack with fallbacks

        Args:
            primary_font: Primary font name
            category: Font category

        Returns:
            Complete font stack string
        """
        system_fonts = {
            'sans-serif': [
                '-apple-system',
                'BlinkMacSystemFont',
                '"Segoe UI"',
                'Roboto',
                '"Helvetica Neue"',
                'Arial',
                'sans-serif'
            ],
            'serif': [
                'Georgia',
                'Cambria',
                '"Times New Roman"',
                'Times',
                'serif'
            ],
            'mono': [
                'Menlo',
                'Monaco',
                'Consolas',
                '"Liberation Mono"',
                '"Courier New"',
                'monospace'
            ]
        }

        # Build font stack
        stack = [f'"{primary_font}"']
        stack.extend(system_fonts.get(category, system_fonts['sans-serif']))

        return ', '.join(stack)