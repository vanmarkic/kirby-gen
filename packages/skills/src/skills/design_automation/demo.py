#!/usr/bin/env python3
"""
Demo script for Design Automation Skill
Shows how to use the skill to generate a design system
"""
import os
import sys
import json
from pprint import pprint

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

# Set API key for demo (in production, use environment variable)
os.environ['ANTHROPIC_API_KEY'] = os.getenv('ANTHROPIC_API_KEY', 'your-api-key-here')

from skills.design_automation import (
    DesignAutomationSkill,
    DesignAutomationInput,
    BrandingAssets
)


def demo_branding_only():
    """Demo with branding assets only"""
    print("=" * 60)
    print("DEMO: Design System from Branding Assets")
    print("=" * 60)

    # Create input with branding assets
    input_data = DesignAutomationInput(
        branding_assets=BrandingAssets(
            colors={
                'primary': '#FF6B6B',    # Coral red
                'secondary': '#4ECDC4',  # Teal
                'accent': '#FFD93D'       # Golden yellow
            },
            fonts=['Montserrat', 'Open Sans']
        )
    )

    # Initialize skill
    skill = DesignAutomationSkill()

    # Generate design system
    print("\n📊 Generating design system...")
    result = skill.generate_design_system(input_data)

    # Display results
    print("\n✅ Design System Generated!")
    print("\n📌 Color Tokens:")
    print(json.dumps(result.tokens.colors.get('primary', {}), indent=2)[:500] + "...")

    print("\n📝 Typography:")
    print(json.dumps(result.tokens.typography, indent=2)[:500] + "...")

    print("\n📐 Spacing System:")
    print(json.dumps(result.tokens.spacing, indent=2)[:300] + "...")

    return result


def demo_pinterest_moodboard():
    """Demo with Pinterest moodboard"""
    print("\n" + "=" * 60)
    print("DEMO: Design System from Pinterest Moodboard")
    print("=" * 60)

    # Create input with Pinterest URL
    input_data = DesignAutomationInput(
        pinterest_url="https://www.pinterest.com/username/modern-portfolio-design",
        branding_assets=BrandingAssets(
            colors={'primary': '#3B82F6'},  # Brand blue
            fonts=['Inter']
        )
    )

    # Initialize skill
    skill = DesignAutomationSkill()

    # Generate design system
    print("\n🎨 Analyzing Pinterest moodboard...")
    result = skill.generate_design_system(input_data)

    # Display moodboard analysis
    if result.moodboard:
        print("\n📍 Moodboard Analysis:")
        print(f"  - Extracted colors: {result.moodboard.extracted_colors[:5]}")
        print(f"  - Mood: {', '.join(result.moodboard.mood)}")
        print(f"  - Keywords: {', '.join(result.moodboard.keywords[:5])}")
        print(f"  - Spacing: {result.moodboard.spacing_analysis['scale']}")

    return result


def demo_export_tokens():
    """Demo exporting design tokens to JSON"""
    print("\n" + "=" * 60)
    print("DEMO: Export Design Tokens")
    print("=" * 60)

    # Generate a design system
    input_data = DesignAutomationInput(
        branding_assets=BrandingAssets(
            colors={'primary': '#8B5CF6'},  # Purple
            fonts=['Space Grotesk', 'IBM Plex Sans']
        ),
        style_preferences={
            'mood': ['modern', 'technical', 'bold'],
            'spacing': 'comfortable'
        }
    )

    skill = DesignAutomationSkill()
    result = skill.generate_design_system(input_data)

    # Export to dictionary (compatible with TypeScript interface)
    design_system_dict = result.to_dict()

    # Save to file
    output_file = '/tmp/design-tokens.json'
    with open(output_file, 'w') as f:
        json.dump(design_system_dict, f, indent=2)

    print(f"\n💾 Design tokens exported to: {output_file}")
    print("\n📄 Token structure:")
    print(json.dumps({
        'tokens': {
            'colors': '...',
            'typography': '...',
            'spacing': '...',
            'breakpoints': '...',
            'shadows': '...',
            'borders': '...',
            'animations': '...'
        },
        'moodboard': '...',
        'branding': '...'
    }, indent=2))

    return design_system_dict


def main():
    """Run all demos"""
    print("\n🎨 DESIGN AUTOMATION SKILL DEMO")
    print("================================\n")

    try:
        # Demo 1: Branding only
        result1 = demo_branding_only()

        # Demo 2: Pinterest moodboard (will use defaults if scraping fails)
        result2 = demo_pinterest_moodboard()

        # Demo 3: Export tokens
        tokens = demo_export_tokens()

        print("\n" + "=" * 60)
        print("✨ All demos completed successfully!")
        print("=" * 60)

    except Exception as e:
        print(f"\n❌ Error: {e}")
        print("\n💡 Make sure to set ANTHROPIC_API_KEY environment variable")


if __name__ == "__main__":
    main()