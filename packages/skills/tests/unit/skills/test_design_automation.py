"""
Unit tests for Design Automation Skill
"""
import pytest
from unittest.mock import Mock, MagicMock, patch
import json
from typing import Dict, Any, List

# Import the skill components
import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), '../../..'))

from src.skills.design_automation import (
    DesignAutomationSkill,
    DesignAutomationInput,
    BrandingAssets,
    ColorExtractor,
    TypographyAnalyzer,
    PinterestAnalyzer,
    MoodboardAnalysis
)


class TestDesignAutomationSkill:
    """Test the main Design Automation Skill"""

    @pytest.fixture
    def skill(self):
        """Create skill instance with mocked API key"""
        with patch.dict(os.environ, {'ANTHROPIC_API_KEY': 'test-key'}):
            return DesignAutomationSkill()

    @pytest.fixture
    def sample_input(self):
        """Create sample input data"""
        return DesignAutomationInput(
            pinterest_url="https://www.pinterest.com/board/example",
            branding_assets=BrandingAssets(
                colors={
                    'primary': '#FF6B6B',
                    'secondary': '#4ECDC4'
                },
                fonts=['Montserrat', 'Open Sans']
            )
        )

    def test_skill_initialization(self):
        """Test skill initialization with API key"""
        with patch.dict(os.environ, {'ANTHROPIC_API_KEY': 'test-key'}):
            skill = DesignAutomationSkill()
            assert skill.api_key == 'test-key'
            assert skill.pinterest_analyzer is not None
            assert skill.color_extractor is not None
            assert skill.typography_analyzer is not None

    def test_skill_initialization_no_key(self):
        """Test skill initialization without API key"""
        with patch.dict(os.environ, {}, clear=True):
            with pytest.raises(ValueError, match="Anthropic API key is required"):
                DesignAutomationSkill()

    @patch.object(PinterestAnalyzer, 'analyze_board')
    def test_generate_design_system_with_pinterest(self, mock_analyze, skill, sample_input):
        """Test design system generation with Pinterest input"""
        # Mock Pinterest analysis
        mock_analyze.return_value = MoodboardAnalysis(
            url="https://www.pinterest.com/board/example",
            extracted_colors=['#FF6B6B', '#4ECDC4', '#95E1D3'],
            dominant_colors=['#FF6B6B', '#4ECDC4'],
            color_palette={
                'primary': '#FF6B6B',
                'secondary': '#4ECDC4',
                'accent': '#95E1D3'
            },
            typography_style={'heading': 'serif', 'body': 'sans-serif'},
            spacing_analysis={'scale': 'comfortable', 'base_unit': 6},
            mood=['modern', 'playful', 'vibrant'],
            keywords=['colorful', 'energetic'],
            design_principles=['contrast', 'rhythm', 'balance']
        )

        result = skill.generate_design_system(sample_input)

        # Verify moodboard was analyzed
        mock_analyze.assert_called_once_with(
            "https://www.pinterest.com/board/example",
            max_images=20
        )

        # Check output structure
        assert result.tokens is not None
        assert result.moodboard is not None
        assert result.branding is not None

        # Check that branding colors override moodboard
        assert '#FF6B6B' in str(result.tokens.colors)

    def test_generate_design_system_pinterest_failure(self, skill):
        """Test fallback when Pinterest analysis fails"""
        input_data = DesignAutomationInput(
            pinterest_url="https://www.pinterest.com/board/example"
        )

        with patch.object(skill.pinterest_analyzer, 'analyze_board',
                        side_effect=Exception("Pinterest error")):
            result = skill.generate_design_system(input_data)

            # Should still return valid design system with defaults
            assert result.tokens is not None
            assert result.tokens.colors is not None
            assert result.tokens.typography is not None

    def test_generate_design_system_branding_only(self, skill):
        """Test design system generation with only branding assets"""
        input_data = DesignAutomationInput(
            branding_assets=BrandingAssets(
                colors={'primary': '#FF0000', 'secondary': '#00FF00'},
                fonts=['Roboto', 'Lato']
            )
        )

        result = skill.generate_design_system(input_data)

        # Check output
        assert result.tokens is not None
        assert '#FF0000' in str(result.tokens.colors)
        assert 'Roboto' in str(result.tokens.typography)

    def test_input_validation(self):
        """Test input validation"""
        # Should raise error with no inputs
        with pytest.raises(ValueError):
            DesignAutomationInput()


class TestColorExtractor:
    """Test the Color Extractor component"""

    @pytest.fixture
    def extractor(self):
        """Create ColorExtractor instance"""
        return ColorExtractor()

    def test_hex_to_rgb_conversion(self, extractor):
        """Test hex to RGB conversion"""
        assert extractor._hex_to_rgb('#FF0000') == (255, 0, 0)
        assert extractor._hex_to_rgb('#00FF00') == (0, 255, 0)
        assert extractor._hex_to_rgb('#0000FF') == (0, 0, 255)
        assert extractor._hex_to_rgb('#FFFFFF') == (255, 255, 255)

    def test_rgb_to_hex_conversion(self, extractor):
        """Test RGB to hex conversion"""
        assert extractor._rgb_to_hex((255, 0, 0)) == '#FF0000'
        assert extractor._rgb_to_hex((0, 255, 0)) == '#00FF00'
        assert extractor._rgb_to_hex((0, 0, 255)) == '#0000FF'

    def test_generate_color_scale(self, extractor):
        """Test color scale generation"""
        scale = extractor.generate_color_scale('#3B82F6', 'blue')

        assert scale.name == 'blue'
        assert scale.base == '#3B82F6'
        assert '50' in scale.scale
        assert '500' in scale.scale
        assert '900' in scale.scale
        assert len(scale.scale) >= 10

    def test_generate_complementary(self, extractor):
        """Test complementary color generation"""
        comp = extractor._generate_complementary('#FF0000')
        # Red's complement should be cyan-ish
        rgb = extractor._hex_to_rgb(comp)
        assert rgb[0] < 50  # Low red
        assert rgb[1] > 200  # High green
        assert rgb[2] > 200  # High blue

    def test_generate_triadic(self, extractor):
        """Test triadic color generation"""
        triadic = extractor._generate_triadic('#FF0000')
        # Red's triadic should include green and blue variants
        assert triadic != '#FF0000'

    def test_create_color_system(self, extractor):
        """Test complete color system creation"""
        system = extractor.create_color_system(
            primary='#FF0000',
            secondary='#00FF00',
            accent='#0000FF'
        )

        assert system.primary.base == '#FF0000'
        assert system.secondary.base == '#00FF00'
        assert system.accent.base == '#0000FF'
        assert system.neutral is not None
        assert 'success' in system.semantic
        assert 'error' in system.semantic

    def test_merge_with_branding(self, extractor):
        """Test merging moodboard colors with branding"""
        moodboard = ['#111111', '#222222', '#333333']
        branding = {'primary': '#FF0000', 'accent': '#00FF00'}

        result = extractor.merge_with_branding(moodboard, branding)

        # Branding should override
        assert result['primary'] == '#FF0000'
        assert result['accent'] == '#00FF00'
        # Moodboard fills in missing
        assert result['secondary'] == '#222222'

    def test_analyze_color_harmony(self, extractor):
        """Test color harmony analysis"""
        # Monochromatic
        mono = extractor.analyze_color_harmony(['#FF0000', '#CC0000', '#990000'])
        assert 'monochromatic' in mono

        # Complementary
        comp = extractor.analyze_color_harmony(['#FF0000', '#00FFFF'])
        assert 'complementary' in comp or 'custom' in comp


class TestTypographyAnalyzer:
    """Test the Typography Analyzer component"""

    @pytest.fixture
    def analyzer(self):
        """Create TypographyAnalyzer instance"""
        return TypographyAnalyzer()

    def test_analyze_mood_typography(self, analyzer):
        """Test typography suggestions based on mood"""
        # Elegant mood
        result = analyzer.analyze_mood_typography(
            mood=['elegant', 'sophisticated'],
            keywords=['luxury', 'premium']
        )
        assert result['heading_style'] == 'serif'
        assert len(result['heading_suggestions']) > 0

        # Modern mood
        result = analyzer.analyze_mood_typography(
            mood=['modern', 'tech'],
            keywords=['futuristic', 'digital']
        )
        assert result['heading_style'] in ['display', 'sans-serif']

        # Playful mood
        result = analyzer.analyze_mood_typography(
            mood=['playful', 'fun'],
            keywords=['creative', 'artistic']
        )
        assert result['heading_style'] == 'display'

    def test_generate_font_pairings(self, analyzer):
        """Test font pairing generation"""
        # With style preference
        pairings = analyzer.generate_font_pairings(style_preference='modern')
        assert len(pairings) > 0
        assert all(isinstance(p, tuple) and len(p) == 2 for p in pairings)

        # Classic style
        pairings = analyzer.generate_font_pairings(style_preference='classic')
        assert len(pairings) > 0
        # Should include serif fonts
        assert any('serif' in p[0].lower() or 'Playfair' in p[0] for p in pairings)

    def test_create_typography_scale(self, analyzer):
        """Test typography scale creation"""
        scale = analyzer.create_typography_scale(
            heading_font='Montserrat',
            body_font='Open Sans',
            base_size=16,
            scale_ratio=1.25
        )

        assert scale.heading_style.value in ['serif', 'sans-serif', 'display', 'mono']
        assert scale.body_style.value in ['serif', 'sans-serif', 'display', 'mono']
        assert scale.base_size == 16
        assert scale.scale_ratio == 1.25
        assert 'heading' in scale.font_families
        assert 'body' in scale.font_families
        assert 'base' in scale.sizes
        assert 'h1' in scale.sizes
        assert 'regular' in scale.weights

    def test_suggest_font_stack(self, analyzer):
        """Test font stack generation"""
        stack = analyzer.suggest_font_stack('Inter', 'sans-serif')
        assert '"Inter"' in stack
        assert 'sans-serif' in stack
        assert '-apple-system' in stack


class TestPinterestAnalyzer:
    """Test the Pinterest Analyzer component"""

    @pytest.fixture
    def analyzer(self):
        """Create PinterestAnalyzer instance with mocked client"""
        with patch('src.skills.design_automation.pinterest_analyzer.Anthropic'):
            return PinterestAnalyzer('test-key')

    def test_fetch_board_images_failure(self, analyzer):
        """Test handling of Pinterest fetch failure"""
        with patch.object(analyzer.session, 'get', side_effect=Exception("Network error")):
            images = analyzer._fetch_board_images("https://pinterest.com/board", 10)
            assert images == []

    def test_extract_from_scripts(self, analyzer):
        """Test extracting images from embedded scripts"""
        html = '''
        <script>
        {"images": {"736x": "https://i.pinimg.com/736x/test.jpg"}}
        </script>
        '''
        images = analyzer._extract_from_scripts(html)
        assert len(images) > 0

    @patch('src.skills.design_automation.pinterest_analyzer.Anthropic')
    def test_analyze_with_vision_mock(self, mock_anthropic, analyzer):
        """Test Claude Vision analysis with mocked response"""
        # Mock Claude response
        mock_response = MagicMock()
        mock_response.content = [MagicMock(text=json.dumps({
            'colors': ['#FF0000', '#00FF00', '#0000FF'],
            'typography': {'style': 'sans-serif'},
            'spacing': 'comfortable',
            'mood': ['modern', 'clean'],
            'design_principles': ['simplicity'],
            'layout_patterns': ['grid'],
            'visual_weight': 'balanced',
            'style_keywords': ['minimal']
        }))]

        analyzer.client.messages.create.return_value = mock_response

        result = analyzer._analyze_with_vision(['https://example.com/image.jpg'])

        assert len(result.colors) == 3
        assert result.spacing == 'comfortable'
        assert 'modern' in result.mood

    def test_get_default_analysis(self, analyzer):
        """Test default analysis fallback"""
        result = analyzer._get_default_analysis("https://pinterest.com/board")

        assert result.url == "https://pinterest.com/board"
        assert len(result.extracted_colors) > 0
        assert result.color_palette['primary'] is not None
        assert result.spacing_analysis['scale'] == 'comfortable'


class TestIntegration:
    """Integration tests for the complete skill"""

    @patch.dict(os.environ, {'ANTHROPIC_API_KEY': 'test-key'})
    @patch('src.skills.design_automation.pinterest_analyzer.Anthropic')
    def test_full_workflow(self, mock_anthropic):
        """Test complete workflow from input to output"""
        # Setup
        skill = DesignAutomationSkill()

        # Mock Claude Vision response
        mock_response = MagicMock()
        mock_response.content = [MagicMock(text=json.dumps({
            'colors': ['#FF6B6B', '#4ECDC4', '#95E1D3'],
            'typography': {'style': 'serif'},
            'spacing': 'spacious',
            'mood': ['elegant', 'sophisticated'],
            'design_principles': ['balance', 'harmony'],
            'layout_patterns': ['asymmetric'],
            'visual_weight': 'light',
            'style_keywords': ['luxury', 'premium']
        }))]
        mock_anthropic.return_value.messages.create.return_value = mock_response

        # Create input
        input_data = DesignAutomationInput(
            pinterest_url="https://www.pinterest.com/board/luxury-design",
            branding_assets=BrandingAssets(
                colors={'primary': '#D4AF37'},  # Gold
                fonts=['Playfair Display']
            )
        )

        # Execute
        with patch.object(skill.pinterest_analyzer, '_fetch_board_images',
                        return_value=['https://example.com/img1.jpg']):
            result = skill.generate_design_system(input_data)

        # Verify output structure
        assert result.tokens is not None
        assert result.moodboard is not None
        assert result.branding is not None

        # Verify branding override
        assert '#D4AF37' in str(result.tokens.colors)

        # Verify typography reflects elegant mood
        typography = result.tokens.typography
        assert 'Playfair Display' in str(typography)

        # Verify spacing is spacious
        spacing = result.tokens.spacing
        assert spacing is not None

        # Convert to dict and verify structure
        output_dict = result.to_dict()
        assert 'tokens' in output_dict
        assert 'colors' in output_dict['tokens']
        assert 'typography' in output_dict['tokens']
        assert 'spacing' in output_dict['tokens']
        assert 'breakpoints' in output_dict['tokens']
        assert 'shadows' in output_dict['tokens']
        assert 'borders' in output_dict['tokens']
        assert 'animations' in output_dict['tokens']


if __name__ == '__main__':
    pytest.main([__file__, '-v'])