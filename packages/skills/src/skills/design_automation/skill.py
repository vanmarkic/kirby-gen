"""
Design Automation Skill
Analyzes Pinterest moodboards and branding assets to generate a complete design system
"""
import os
import logging
from typing import Dict, Any, Optional
from anthropic import Anthropic

from .models import (
    DesignAutomationInput,
    DesignSystemOutput,
    DesignTokens,
    BrandingAssets,
    MoodboardAnalysis
)
from .pinterest_analyzer import PinterestAnalyzer
from .color_extractor import ColorExtractor
from .typography_analyzer import TypographyAnalyzer

logger = logging.getLogger(__name__)


class DesignAutomationSkill:
    """
    Main skill for automated design system generation
    """

    def __init__(self, anthropic_api_key: Optional[str] = None):
        """
        Initialize the design automation skill

        Args:
            anthropic_api_key: API key for Anthropic Claude
        """
        self.api_key = anthropic_api_key or os.getenv('ANTHROPIC_API_KEY')
        if not self.api_key:
            raise ValueError("Anthropic API key is required. Set ANTHROPIC_API_KEY environment variable.")

        self.pinterest_analyzer = PinterestAnalyzer(self.api_key)
        self.color_extractor = ColorExtractor()
        self.typography_analyzer = TypographyAnalyzer()

    def generate_design_system(self, input_data: DesignAutomationInput) -> DesignSystemOutput:
        """
        Generate a complete design system from inputs

        Args:
            input_data: Pinterest URL and/or branding assets

        Returns:
            Complete design system following DesignSystemSchema
        """
        logger.info("Starting design system generation")

        # Initialize components
        moodboard_analysis = None
        extracted_colors = []
        mood = []
        keywords = []

        # Analyze Pinterest board if provided
        if input_data.pinterest_url:
            logger.info(f"Analyzing Pinterest board: {input_data.pinterest_url}")
            try:
                moodboard_analysis = self.pinterest_analyzer.analyze_board(
                    str(input_data.pinterest_url),
                    max_images=20
                )
                extracted_colors = moodboard_analysis.extracted_colors
                mood = moodboard_analysis.mood
                keywords = moodboard_analysis.keywords
            except Exception as e:
                logger.warning(f"Pinterest analysis failed, using defaults: {e}")
                moodboard_analysis = self._get_default_moodboard_analysis(str(input_data.pinterest_url))
                extracted_colors = moodboard_analysis.extracted_colors
                mood = moodboard_analysis.mood

        # Process branding assets
        brand_colors = {}
        brand_fonts = []

        if input_data.branding_assets:
            # Extract colors from logo if provided
            if input_data.branding_assets.logo_path:
                logger.info("Extracting colors from logo")
                logo_colors = self.color_extractor.extract_from_image(
                    input_data.branding_assets.logo_path
                )
                if logo_colors:
                    brand_colors['primary'] = logo_colors[0]
                    if len(logo_colors) > 1:
                        brand_colors['secondary'] = logo_colors[1]

            # Use provided brand colors (override extracted)
            if input_data.branding_assets.colors:
                brand_colors.update(input_data.branding_assets.colors)

            # Use provided fonts
            if input_data.branding_assets.fonts:
                brand_fonts = input_data.branding_assets.fonts

        # Merge colors (branding takes precedence)
        final_colors = self.color_extractor.merge_with_branding(
            extracted_colors,
            brand_colors
        )

        # Generate complete color system
        color_system = self.color_extractor.create_color_system(
            primary=final_colors.get('primary', '#3B82F6'),
            secondary=final_colors.get('secondary'),
            accent=final_colors.get('accent'),
            brand_colors=brand_colors
        )

        # Generate typography system
        if brand_fonts:
            # Use brand fonts
            heading_font = brand_fonts[0]
            body_font = brand_fonts[1] if len(brand_fonts) > 1 else brand_fonts[0]
        else:
            # Suggest fonts based on mood
            typography_suggestions = self.typography_analyzer.analyze_mood_typography(
                mood,
                keywords
            )
            suggested_fonts = self.typography_analyzer.generate_font_pairings(
                style_preference='modern' if 'modern' in mood else 'classic'
            )
            heading_font = suggested_fonts[0][0] if suggested_fonts else 'Inter'
            body_font = suggested_fonts[0][1] if suggested_fonts else 'Inter'

        typography_scale = self.typography_analyzer.create_typography_scale(
            heading_font=heading_font,
            body_font=body_font,
            base_size=16,
            scale_ratio=1.25
        )

        # Generate spacing system
        spacing_scale = moodboard_analysis.spacing_analysis['scale'] if moodboard_analysis else 'comfortable'
        base_unit = moodboard_analysis.spacing_analysis['base_unit'] if moodboard_analysis else 6

        spacing_system = self._generate_spacing_system(spacing_scale, base_unit)

        # Generate additional design tokens
        design_tokens = DesignTokens(
            colors=self._format_color_tokens(color_system),
            typography=self._format_typography_tokens(typography_scale),
            spacing=spacing_system,
            breakpoints=self._generate_breakpoints(),
            shadows=self._generate_shadows(color_system),
            borders=self._generate_borders(color_system),
            animations=self._generate_animations()
        )

        # Create final output
        output = DesignSystemOutput(
            tokens=design_tokens,
            moodboard=moodboard_analysis,
            branding=input_data.branding_assets or BrandingAssets()
        )

        logger.info("Design system generation completed")
        return output

    def _format_color_tokens(self, color_system) -> Dict[str, Any]:
        """Format color system as design tokens"""
        tokens = {}

        # Add color scales
        for scale_name in ['primary', 'secondary', 'accent', 'neutral']:
            scale = getattr(color_system, scale_name)
            if scale:
                tokens[scale_name] = scale.scale

        # Add semantic colors
        tokens['semantic'] = color_system.semantic

        # Add brand colors
        tokens['brand'] = color_system.brand

        return tokens

    def _format_typography_tokens(self, typography_scale) -> Dict[str, Any]:
        """Format typography scale as design tokens"""
        return {
            'fontFamilies': typography_scale.font_families,
            'sizes': typography_scale.sizes,
            'weights': typography_scale.weights,
            'lineHeights': typography_scale.line_heights,
            'letterSpacing': {
                'tighter': '-0.05em',
                'tight': '-0.025em',
                'normal': '0',
                'wide': '0.025em',
                'wider': '0.05em',
                'widest': '0.1em'
            }
        }

    def _generate_spacing_system(self, scale: str, base_unit: int) -> Dict[str, Any]:
        """Generate spacing system tokens"""
        multipliers = {
            'compact': [0, 0.25, 0.5, 1, 1.5, 2, 3, 4, 6, 8, 12, 16, 24],
            'comfortable': [0, 0.5, 1, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10, 12, 16, 20, 24],
            'spacious': [0, 0.5, 1, 2, 3, 4, 5, 6, 8, 10, 12, 16, 20, 24, 32, 40]
        }

        scale_multipliers = multipliers.get(scale, multipliers['comfortable'])

        spacing = {}
        for i, multiplier in enumerate(scale_multipliers):
            key = str(i) if i < 10 else f'{i}'
            value = base_unit * multiplier
            spacing[key] = f'{value}px' if value > 0 else '0'

        # Add semantic spacing
        spacing.update({
            'xs': spacing['1'],
            'sm': spacing['2'],
            'md': spacing['4'],
            'lg': spacing['6'],
            'xl': spacing['8'],
            '2xl': spacing['10'],
            '3xl': spacing['12']
        })

        return spacing

    def _generate_breakpoints(self) -> Dict[str, Any]:
        """Generate responsive breakpoints"""
        return {
            'xs': '0px',
            'sm': '640px',
            'md': '768px',
            'lg': '1024px',
            'xl': '1280px',
            '2xl': '1536px',
            'mobile': '640px',
            'tablet': '768px',
            'laptop': '1024px',
            'desktop': '1280px',
            'wide': '1536px'
        }

    def _generate_shadows(self, color_system) -> Dict[str, Any]:
        """Generate shadow tokens"""
        shadow_color = color_system.neutral.scale['900'] if color_system.neutral else '#000000'

        return {
            'xs': f'0 1px 2px 0 {shadow_color}10',
            'sm': f'0 1px 3px 0 {shadow_color}10, 0 1px 2px -1px {shadow_color}10',
            'md': f'0 4px 6px -1px {shadow_color}10, 0 2px 4px -2px {shadow_color}10',
            'lg': f'0 10px 15px -3px {shadow_color}10, 0 4px 6px -4px {shadow_color}10',
            'xl': f'0 20px 25px -5px {shadow_color}10, 0 8px 10px -6px {shadow_color}10',
            '2xl': f'0 25px 50px -12px {shadow_color}25',
            'inner': f'inset 0 2px 4px 0 {shadow_color}06',
            'none': 'none'
        }

    def _generate_borders(self, color_system) -> Dict[str, Any]:
        """Generate border tokens"""
        border_color = color_system.neutral.scale['200'] if color_system.neutral else '#E5E7EB'

        return {
            'radius': {
                'none': '0',
                'sm': '0.125rem',
                'md': '0.375rem',
                'lg': '0.5rem',
                'xl': '0.75rem',
                '2xl': '1rem',
                '3xl': '1.5rem',
                'full': '9999px'
            },
            'width': {
                '0': '0',
                '1': '1px',
                '2': '2px',
                '4': '4px',
                '8': '8px'
            },
            'color': {
                'default': border_color,
                'light': color_system.neutral.scale['100'] if color_system.neutral else '#F3F4F6',
                'dark': color_system.neutral.scale['300'] if color_system.neutral else '#D1D5DB'
            }
        }

    def _generate_animations(self) -> Dict[str, Any]:
        """Generate animation tokens"""
        return {
            'duration': {
                'fast': '150ms',
                'normal': '250ms',
                'slow': '350ms',
                'slower': '500ms'
            },
            'timing': {
                'ease': 'cubic-bezier(0.4, 0, 0.2, 1)',
                'easeIn': 'cubic-bezier(0.4, 0, 1, 1)',
                'easeOut': 'cubic-bezier(0, 0, 0.2, 1)',
                'easeInOut': 'cubic-bezier(0.4, 0, 0.2, 1)',
                'linear': 'linear'
            },
            'transition': {
                'default': 'all 250ms cubic-bezier(0.4, 0, 0.2, 1)',
                'fast': 'all 150ms cubic-bezier(0.4, 0, 0.2, 1)',
                'slow': 'all 350ms cubic-bezier(0.4, 0, 0.2, 1)'
            }
        }

    def _get_default_moodboard_analysis(self, url: str) -> MoodboardAnalysis:
        """Return default moodboard analysis"""
        return MoodboardAnalysis(
            url=url,
            extracted_colors=['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'],
            dominant_colors=['#3B82F6', '#10B981', '#F59E0B'],
            color_palette={
                'primary': '#3B82F6',
                'secondary': '#10B981',
                'accent': '#F59E0B',
                'background': '#FFFFFF',
                'text': '#1F2937'
            },
            typography_style={
                'heading': 'sans-serif',
                'body': 'sans-serif',
                'scale': '1.25'
            },
            spacing_analysis={
                'scale': 'comfortable',
                'base_unit': 6
            },
            mood=['modern', 'clean', 'professional'],
            keywords=['minimal', 'contemporary', 'elegant'],
            design_principles=['clarity', 'simplicity', 'hierarchy']
        )


def create_skill(api_key: Optional[str] = None) -> DesignAutomationSkill:
    """
    Factory function to create skill instance

    Args:
        api_key: Optional Anthropic API key

    Returns:
        DesignAutomationSkill instance
    """
    return DesignAutomationSkill(api_key)