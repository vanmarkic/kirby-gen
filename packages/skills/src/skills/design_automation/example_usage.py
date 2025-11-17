#!/usr/bin/env python3
"""
Example usage of the Design Automation Skill
This shows how the skill will be used in the actual pipeline
"""
import json
import os
import sys

# Add parent directory for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from skills.design_automation import (
    DesignAutomationSkill,
    DesignAutomationInput,
    BrandingAssets,
    ColorExtractor,
    TypographyAnalyzer
)


def example_standalone_components():
    """Example of using individual components"""
    print("=" * 60)
    print("EXAMPLE: Using Standalone Components")
    print("=" * 60)

    # Color Extractor Example
    print("\n🎨 Color Extractor:")
    extractor = ColorExtractor()

    # Generate a color scale
    primary_scale = extractor.generate_color_scale('#3B82F6', 'primary')
    print(f"Generated {len(primary_scale.scale)} shades for primary color")
    print(f"Shades: {list(primary_scale.scale.keys())}")

    # Create color system
    color_system = extractor.create_color_system(
        primary='#3B82F6',
        secondary='#10B981'
    )
    print(f"Created color system with {len(color_system.semantic)} semantic colors")

    # Typography Analyzer Example
    print("\n✏️ Typography Analyzer:")
    analyzer = TypographyAnalyzer()

    # Get suggestions based on mood
    suggestions = analyzer.analyze_mood_typography(
        mood=['modern', 'professional'],
        keywords=['tech', 'startup']
    )
    print(f"Heading style: {suggestions['heading_style']}")
    print(f"Body style: {suggestions['body_style']}")
    print(f"Suggested heading fonts: {suggestions['heading_suggestions'][:3]}")

    # Generate font pairings
    pairings = analyzer.generate_font_pairings(style_preference='modern')
    print(f"\nFont pairings for modern style:")
    for heading, body in pairings[:3]:
        print(f"  - {heading} / {body}")


def example_full_pipeline():
    """Example of full design system generation"""
    print("\n" + "=" * 60)
    print("EXAMPLE: Full Design System Generation")
    print("=" * 60)

    # Create input with both Pinterest and branding
    input_data = DesignAutomationInput(
        pinterest_url="https://www.pinterest.com/example/portfolio-inspiration",
        branding_assets=BrandingAssets(
            colors={
                'primary': '#8B5CF6',    # Purple
                'secondary': '#EC4899',  # Pink
            },
            fonts=['Inter', 'Space Grotesk']
        ),
        style_preferences={
            'mood': ['modern', 'bold', 'creative'],
            'spacing': 'comfortable'
        }
    )

    print("\n📋 Input Configuration:")
    print(f"  - Pinterest URL: {input_data.pinterest_url}")
    print(f"  - Brand colors: {input_data.branding_assets.colors}")
    print(f"  - Brand fonts: {input_data.branding_assets.fonts}")
    print(f"  - Style preferences: {input_data.style_preferences}")

    # Note: In production, this would generate the full design system
    # For demo without API key, we'll show the structure
    print("\n📊 Design System Structure (would be generated):")

    design_structure = {
        "tokens": {
            "colors": {
                "primary": {"50": "...", "500": "#8B5CF6", "900": "..."},
                "secondary": {"50": "...", "500": "#EC4899", "900": "..."},
                "neutral": {"50": "...", "500": "...", "900": "..."},
                "semantic": {
                    "success": "#10B981",
                    "warning": "#F59E0B",
                    "error": "#EF4444",
                    "info": "#3B82F6"
                }
            },
            "typography": {
                "fontFamilies": {
                    "heading": "'Inter', sans-serif",
                    "body": "'Space Grotesk', sans-serif",
                    "mono": "'Fira Code', monospace"
                },
                "sizes": {
                    "xs": "12px",
                    "sm": "14px",
                    "base": "16px",
                    "lg": "20px",
                    "xl": "25px",
                    "2xl": "31px",
                    "3xl": "39px",
                    "4xl": "48px"
                }
            },
            "spacing": {
                "0": "0",
                "1": "4px",
                "2": "8px",
                "4": "16px",
                "8": "32px",
                "12": "48px",
                "16": "64px"
            },
            "breakpoints": {
                "mobile": "640px",
                "tablet": "768px",
                "laptop": "1024px",
                "desktop": "1280px"
            },
            "shadows": {
                "sm": "0 1px 2px 0 rgba(0,0,0,0.05)",
                "md": "0 4px 6px -1px rgba(0,0,0,0.1)",
                "lg": "0 10px 15px -3px rgba(0,0,0,0.1)"
            },
            "borders": {
                "radius": {
                    "sm": "0.125rem",
                    "md": "0.375rem",
                    "lg": "0.5rem",
                    "full": "9999px"
                }
            },
            "animations": {
                "duration": {
                    "fast": "150ms",
                    "normal": "250ms",
                    "slow": "350ms"
                },
                "timing": {
                    "ease": "cubic-bezier(0.4, 0, 0.2, 1)"
                }
            }
        },
        "moodboard": {
            "analyzed": True,
            "mood": ["modern", "bold", "creative"],
            "extractedColors": ["..."],
            "designPrinciples": ["contrast", "hierarchy", "balance"]
        },
        "branding": {
            "colors": input_data.branding_assets.colors,
            "fonts": input_data.branding_assets.fonts
        }
    }

    print(json.dumps(design_structure, indent=2))


def example_color_operations():
    """Example of color manipulation operations"""
    print("\n" + "=" * 60)
    print("EXAMPLE: Color Operations")
    print("=" * 60)

    extractor = ColorExtractor()
    base_color = '#3B82F6'  # Blue

    print(f"\n🎨 Base color: {base_color}")

    # Generate complementary
    comp = extractor._generate_complementary(base_color)
    print(f"Complementary: {comp}")

    # Generate triadic
    triadic = extractor._generate_triadic(base_color)
    print(f"Triadic: {triadic}")

    # Generate analogous colors
    analogous = extractor._generate_analogous(base_color)
    print(f"Analogous palette: {analogous[:3]}")

    # Generate full scale
    scale = extractor.generate_color_scale(base_color, 'custom')
    print(f"\nColor scale:")
    for shade, value in list(scale.scale.items())[:5]:
        print(f"  {shade}: {value}")

    # Analyze harmony
    harmony = extractor.analyze_color_harmony([base_color, comp])
    print(f"\nHarmony type: {harmony}")


def main():
    """Run all examples"""
    print("\n🎨 DESIGN AUTOMATION SKILL - USAGE EXAMPLES")
    print("=" * 60)

    # Example 1: Standalone components
    example_standalone_components()

    # Example 2: Full pipeline
    example_full_pipeline()

    # Example 3: Color operations
    example_color_operations()

    print("\n" + "=" * 60)
    print("✨ Examples completed!")
    print("\n💡 To use with real Pinterest analysis, set ANTHROPIC_API_KEY")
    print("   export ANTHROPIC_API_KEY='your-key-here'")
    print("=" * 60)


if __name__ == "__main__":
    main()