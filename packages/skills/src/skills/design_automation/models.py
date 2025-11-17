"""
Pydantic models for Design Automation skill
"""
from typing import Dict, List, Optional, Any, Literal
from pydantic import BaseModel, Field, HttpUrl, validator
from enum import Enum


class FontStyle(str, Enum):
    """Typography styles for headings and body text"""
    SERIF = "serif"
    SANS_SERIF = "sans-serif"
    DISPLAY = "display"
    MONO = "mono"


class SpacingScale(str, Enum):
    """Spacing density scales"""
    COMPACT = "compact"
    COMFORTABLE = "comfortable"
    SPACIOUS = "spacious"


class ColorShade(BaseModel):
    """Individual color shade with its value"""
    shade: int
    value: str


class ColorScale(BaseModel):
    """Complete color scale from 50 to 900"""
    name: str
    base: str
    scale: Dict[str, str] = Field(default_factory=dict)

    def __init__(self, **data):
        super().__init__(**data)
        if not self.scale and self.base:
            # Will be populated by color_extractor
            pass


class BrandingAssets(BaseModel):
    """Input branding assets from client"""
    logo_path: Optional[str] = None
    colors: Optional[Dict[str, str]] = Field(default_factory=dict)
    fonts: Optional[List[str]] = Field(default_factory=list)
    guidelines_path: Optional[str] = None


class PinterestInput(BaseModel):
    """Pinterest moodboard input"""
    board_url: HttpUrl
    max_images: int = Field(default=20, ge=1, le=50)


class MoodboardAnalysis(BaseModel):
    """Analysis results from Pinterest moodboard"""
    url: str
    extracted_colors: List[str]
    dominant_colors: List[str]
    color_palette: Dict[str, str]
    typography_style: Dict[str, str]
    spacing_analysis: Dict[str, Any]
    mood: List[str]
    keywords: List[str]
    design_principles: List[str]


class TypographyScale(BaseModel):
    """Typography scale and configuration"""
    heading_style: FontStyle
    body_style: FontStyle
    scale_ratio: float = Field(default=1.25, ge=1.1, le=2.0)
    base_size: int = Field(default=16, ge=12, le=20)
    font_families: Dict[str, str]
    sizes: Dict[str, str]
    weights: Dict[str, int]
    line_heights: Dict[str, float]


class SpacingSystem(BaseModel):
    """Spacing system configuration"""
    scale: SpacingScale
    base_unit: int = Field(default=4, ge=2, le=8)
    values: Dict[str, str]


class ColorSystem(BaseModel):
    """Complete color system with semantic colors"""
    primary: ColorScale
    secondary: Optional[ColorScale] = None
    accent: Optional[ColorScale] = None
    neutral: ColorScale
    semantic: Dict[str, str]
    brand: Dict[str, str]


class DesignTokens(BaseModel):
    """Design tokens following the project schema"""
    colors: Dict[str, Any]
    typography: Dict[str, Any]
    spacing: Dict[str, Any]
    breakpoints: Dict[str, Any]
    shadows: Dict[str, Any]
    borders: Dict[str, Any]
    animations: Dict[str, Any]
    custom: Optional[Dict[str, Dict[str, Any]]] = None


class DesignSystemOutput(BaseModel):
    """Complete design system output matching DesignSystemSchema"""
    tokens: DesignTokens
    moodboard: Optional[MoodboardAnalysis] = None
    branding: BrandingAssets

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary matching TypeScript interface"""
        return {
            "tokens": {
                "colors": self.tokens.colors,
                "typography": self.tokens.typography,
                "spacing": self.tokens.spacing,
                "breakpoints": self.tokens.breakpoints,
                "shadows": self.tokens.shadows,
                "borders": self.tokens.borders,
                "animations": self.tokens.animations,
                "custom": self.tokens.custom or {}
            },
            "moodboard": self.moodboard.dict() if self.moodboard else None,
            "branding": {
                "colors": self.branding.colors,
                "fonts": [
                    {
                        "name": font,
                        "family": font,
                        "weights": [400, 500, 600, 700],
                        "source": "google"
                    } for font in (self.branding.fonts or [])
                ]
            }
        }


class DesignAutomationInput(BaseModel):
    """Main input model for the skill"""
    pinterest_url: Optional[HttpUrl] = None
    branding_assets: Optional[BrandingAssets] = None
    style_preferences: Optional[Dict[str, Any]] = Field(default_factory=dict)

    @validator('pinterest_url', 'branding_assets')
    def at_least_one_input(cls, v, values):
        """Ensure at least one input source is provided"""
        if not v and not values.get('branding_assets') and not values.get('pinterest_url'):
            raise ValueError("At least one of pinterest_url or branding_assets must be provided")
        return v


class AnalysisResult(BaseModel):
    """Result from Claude Vision analysis"""
    colors: List[str]
    typography: Dict[str, str]
    spacing: str
    mood: List[str]
    design_principles: List[str]
    layout_patterns: List[str]
    visual_weight: str
    style_keywords: List[str]