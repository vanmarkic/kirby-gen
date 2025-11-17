"""
Pinterest board analyzer using web scraping and Claude Vision
"""
import re
import json
import time
import logging
from typing import List, Dict, Optional, Any
from urllib.parse import urlparse, quote
import requests
from bs4 import BeautifulSoup
from anthropic import Anthropic
from PIL import Image
from io import BytesIO
import base64

from .models import MoodboardAnalysis, AnalysisResult

logger = logging.getLogger(__name__)


class PinterestAnalyzer:
    """Analyzes Pinterest boards for design patterns and inspiration"""

    def __init__(self, anthropic_api_key: str):
        """Initialize with Anthropic client for Vision analysis"""
        self.client = Anthropic(api_key=anthropic_api_key)
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        })

    def analyze_board(self, board_url: str, max_images: int = 20) -> MoodboardAnalysis:
        """
        Analyze a Pinterest board for design patterns

        Args:
            board_url: URL of the Pinterest board
            max_images: Maximum number of images to analyze

        Returns:
            MoodboardAnalysis with extracted design patterns
        """
        try:
            # Extract images from Pinterest board
            images = self._fetch_board_images(board_url, max_images)

            if not images:
                # If scraping fails, return default analysis
                logger.warning(f"Could not fetch images from {board_url}, using defaults")
                return self._get_default_analysis(board_url)

            # Analyze images with Claude Vision
            analysis = self._analyze_with_vision(images[:max_images])

            # Process and structure the analysis
            return self._process_analysis(board_url, analysis, images)

        except Exception as e:
            logger.error(f"Error analyzing Pinterest board: {e}")
            return self._get_default_analysis(board_url)

    def _fetch_board_images(self, board_url: str, limit: int) -> List[str]:
        """
        Fetch image URLs from Pinterest board

        Note: Pinterest has anti-scraping measures, so this uses a simplified approach
        that may not always work. In production, consider using Pinterest API.
        """
        images = []

        try:
            # Try basic HTML scraping first
            response = self.session.get(board_url, timeout=10)
            response.raise_for_status()

            soup = BeautifulSoup(response.text, 'html.parser')

            # Look for image elements (Pinterest structure varies)
            # Try multiple selectors as Pinterest changes their structure
            selectors = [
                'img[src*="pinimg.com"]',
                'img[srcset*="pinimg.com"]',
                'div[data-test-id="pin"] img',
                'div.GrowthUnauthPinImage img',
                'img.hCL.kVc.L4E.MIw'
            ]

            for selector in selectors:
                img_elements = soup.select(selector)
                for img in img_elements:
                    src = img.get('src') or img.get('srcset', '').split(',')[0].split(' ')[0]
                    if src and 'pinimg.com' in src:
                        # Convert thumbnail to larger size
                        src = src.replace('/236x/', '/736x/')
                        if src not in images:
                            images.append(src)
                            if len(images) >= limit:
                                break
                if len(images) >= limit:
                    break

            # If basic scraping doesn't work, try extracting from JavaScript
            if len(images) < 5:
                script_images = self._extract_from_scripts(response.text)
                images.extend([img for img in script_images if img not in images])

        except Exception as e:
            logger.warning(f"Error fetching Pinterest images: {e}")

        return images[:limit]

    def _extract_from_scripts(self, html_content: str) -> List[str]:
        """Extract image URLs from embedded JavaScript/JSON"""
        images = []

        # Look for JSON data in script tags
        script_pattern = re.compile(r'<script[^>]*>.*?({.*?"images".*?}).*?</script>', re.DOTALL)
        matches = script_pattern.findall(html_content)

        for match in matches:
            try:
                # Try to parse as JSON
                data = json.loads(match)
                images.extend(self._extract_images_from_json(data))
            except:
                pass

        # Also look for direct image URLs in scripts
        url_pattern = re.compile(r'https?://[^"\s]*pinimg\.com/[^"\s]+')
        urls = url_pattern.findall(html_content)

        for url in urls:
            if '/736x/' in url or '/originals/' in url:
                images.append(url)

        return images

    def _extract_images_from_json(self, data: Any, images: List[str] = None) -> List[str]:
        """Recursively extract image URLs from JSON data"""
        if images is None:
            images = []

        if isinstance(data, dict):
            for key, value in data.items():
                if key in ['images', 'image', 'url', 'src']:
                    if isinstance(value, str) and 'pinimg.com' in value:
                        images.append(value.replace('/236x/', '/736x/'))
                    elif isinstance(value, dict):
                        self._extract_images_from_json(value, images)
                elif isinstance(value, (dict, list)):
                    self._extract_images_from_json(value, images)
        elif isinstance(data, list):
            for item in data:
                self._extract_images_from_json(item, images)

        return images

    def _analyze_with_vision(self, image_urls: List[str]) -> AnalysisResult:
        """Use Claude Vision to analyze design patterns in images"""

        # Download and prepare images for analysis
        images_data = []
        for url in image_urls[:5]:  # Analyze first 5 images for efficiency
            try:
                response = self.session.get(url, timeout=10)
                img = Image.open(BytesIO(response.content))

                # Resize if too large
                if img.width > 1024 or img.height > 1024:
                    img.thumbnail((1024, 1024), Image.Resampling.LANCZOS)

                # Convert to base64
                buffered = BytesIO()
                img.save(buffered, format="JPEG", quality=85)
                img_base64 = base64.b64encode(buffered.getvalue()).decode('utf-8')
                images_data.append(img_base64)

            except Exception as e:
                logger.warning(f"Error processing image {url}: {e}")
                continue

        if not images_data:
            return self._get_default_analysis_result()

        # Prepare vision prompt
        prompt = """Analyze these design images from a Pinterest moodboard and extract:

1. COLOR PALETTE:
   - List the dominant colors (hex codes if possible)
   - Identify color relationships and harmony
   - Note any accent colors

2. TYPOGRAPHY STYLE:
   - Identify font styles (serif, sans-serif, display, etc.)
   - Note typography hierarchy patterns
   - Suggest similar Google Fonts

3. SPACING & LAYOUT:
   - Identify spacing patterns (tight, comfortable, spacious)
   - Note grid systems or layout patterns
   - Visual density and white space usage

4. MOOD & STYLE:
   - List 3-5 mood descriptors (modern, vintage, playful, etc.)
   - Design principles observed
   - Visual style keywords

5. DESIGN PATTERNS:
   - Common design elements
   - Visual motifs
   - Layout patterns

Provide a structured JSON response with these categories."""

        try:
            # Create message with images
            messages = [
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "text",
                            "text": prompt
                        }
                    ] + [
                        {
                            "type": "image",
                            "source": {
                                "type": "base64",
                                "media_type": "image/jpeg",
                                "data": img_data
                            }
                        } for img_data in images_data
                    ]
                }
            ]

            response = self.client.messages.create(
                model="claude-3-5-sonnet-20241022",
                max_tokens=2000,
                messages=messages,
                temperature=0.3
            )

            # Parse the response
            content = response.content[0].text

            # Try to extract JSON from response
            json_match = re.search(r'\{[\s\S]*\}', content)
            if json_match:
                analysis_data = json.loads(json_match.group())
            else:
                # Parse text response into structure
                analysis_data = self._parse_text_response(content)

            return AnalysisResult(
                colors=analysis_data.get('colors', []),
                typography=analysis_data.get('typography', {}),
                spacing=analysis_data.get('spacing', 'comfortable'),
                mood=analysis_data.get('mood', []),
                design_principles=analysis_data.get('design_principles', []),
                layout_patterns=analysis_data.get('layout_patterns', []),
                visual_weight=analysis_data.get('visual_weight', 'balanced'),
                style_keywords=analysis_data.get('style_keywords', [])
            )

        except Exception as e:
            logger.error(f"Error in Claude Vision analysis: {e}")
            return self._get_default_analysis_result()

    def _parse_text_response(self, text: str) -> Dict[str, Any]:
        """Parse unstructured text response into structured data"""
        result = {
            'colors': [],
            'typography': {},
            'spacing': 'comfortable',
            'mood': [],
            'design_principles': [],
            'layout_patterns': [],
            'visual_weight': 'balanced',
            'style_keywords': []
        }

        # Extract hex colors
        hex_pattern = re.compile(r'#[0-9a-fA-F]{6}')
        result['colors'] = hex_pattern.findall(text)

        # Extract mood words
        mood_keywords = ['modern', 'vintage', 'minimal', 'bold', 'playful', 'elegant',
                        'sophisticated', 'rustic', 'industrial', 'organic', 'clean']
        for keyword in mood_keywords:
            if keyword.lower() in text.lower():
                result['mood'].append(keyword)

        # Extract typography mentions
        if 'serif' in text.lower():
            result['typography']['style'] = 'serif'
        elif 'sans-serif' in text.lower() or 'sans serif' in text.lower():
            result['typography']['style'] = 'sans-serif'

        # Extract spacing
        if 'spacious' in text.lower() or 'airy' in text.lower():
            result['spacing'] = 'spacious'
        elif 'compact' in text.lower() or 'tight' in text.lower():
            result['spacing'] = 'compact'

        return result

    def _process_analysis(self, board_url: str, analysis: AnalysisResult,
                         images: List[str]) -> MoodboardAnalysis:
        """Process analysis results into MoodboardAnalysis"""

        # Generate color palette with semantic names
        color_palette = {}
        if analysis.colors:
            color_palette['primary'] = analysis.colors[0] if analysis.colors else '#3B82F6'
            if len(analysis.colors) > 1:
                color_palette['secondary'] = analysis.colors[1]
            if len(analysis.colors) > 2:
                color_palette['accent'] = analysis.colors[2]
            color_palette['background'] = '#FFFFFF'
            color_palette['text'] = '#1F2937'

        # Process typography analysis
        typography_style = {
            'heading': analysis.typography.get('style', 'sans-serif'),
            'body': 'sans-serif' if analysis.typography.get('style') == 'serif' else 'serif',
            'scale': '1.25'
        }

        # Process spacing
        spacing_analysis = {
            'scale': analysis.spacing,
            'base_unit': 4 if analysis.spacing == 'compact' else 8 if analysis.spacing == 'spacious' else 6
        }

        return MoodboardAnalysis(
            url=board_url,
            extracted_colors=analysis.colors[:10],
            dominant_colors=analysis.colors[:3],
            color_palette=color_palette,
            typography_style=typography_style,
            spacing_analysis=spacing_analysis,
            mood=analysis.mood[:5],
            keywords=analysis.style_keywords[:8],
            design_principles=analysis.design_principles[:5]
        )

    def _get_default_analysis(self, board_url: str) -> MoodboardAnalysis:
        """Return default analysis when Pinterest scraping fails"""
        return MoodboardAnalysis(
            url=board_url,
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

    def _get_default_analysis_result(self) -> AnalysisResult:
        """Return default analysis result"""
        return AnalysisResult(
            colors=['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'],
            typography={'style': 'sans-serif'},
            spacing='comfortable',
            mood=['modern', 'clean', 'professional'],
            design_principles=['clarity', 'simplicity', 'hierarchy'],
            layout_patterns=['grid', 'cards', 'hero'],
            visual_weight='balanced',
            style_keywords=['minimal', 'contemporary']
        )