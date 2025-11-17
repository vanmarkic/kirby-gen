"""
Design Automation Skill Package
Analyzes Pinterest moodboards and branding assets to generate complete design systems
"""

from .skill import DesignAutomationSkill, create_skill
from .models import (
    DesignAutomationInput,
    DesignSystemOutput,
    BrandingAssets,
    MoodboardAnalysis,
    ColorScale,
    TypographyScale,
    DesignTokens
)
from .pinterest_analyzer import PinterestAnalyzer
from .color_extractor import ColorExtractor
from .typography_analyzer import TypographyAnalyzer

__all__ = [
    # Main skill
    'DesignAutomationSkill',
    'create_skill',

    # Models
    'DesignAutomationInput',
    'DesignSystemOutput',
    'BrandingAssets',
    'MoodboardAnalysis',
    'ColorScale',
    'TypographyScale',
    'DesignTokens',

    # Components
    'PinterestAnalyzer',
    'ColorExtractor',
    'TypographyAnalyzer'
]

__version__ = '1.0.0'