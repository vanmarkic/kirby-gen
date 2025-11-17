"""
File parsers for different content formats
Handles extraction of content from various file types
"""

import os
import re
import json
import logging
from typing import Dict, List, Optional, Any, Tuple
from datetime import datetime
from pathlib import Path
import mimetypes

# External dependencies (will be in requirements.txt)
try:
    import markdown
except ImportError:
    markdown = None

try:
    from docx import Document
except ImportError:
    Document = None

try:
    import PyPDF2
except ImportError:
    PyPDF2 = None

try:
    from PIL import Image
    from PIL.ExifTags import TAGS
except ImportError:
    Image = None
    TAGS = None

from .models import (
    ExtractedContent,
    ExtractedImage,
    ContentSection,
    FileFormat
)

# Configure logging
logger = logging.getLogger(__name__)


class BaseParser:
    """Base class for all content parsers"""

    def __init__(self):
        self.supported_extensions: List[str] = []
        self.supported_mimetypes: List[str] = []

    def can_parse(self, file_path: str, mime_type: Optional[str] = None) -> bool:
        """Check if this parser can handle the file"""
        ext = Path(file_path).suffix.lower()

        if ext in self.supported_extensions:
            return True

        if mime_type and mime_type in self.supported_mimetypes:
            return True

        return False

    def parse(self, file_path: str) -> ExtractedContent:
        """Parse the file and extract content"""
        raise NotImplementedError("Subclasses must implement parse()")

    def extract_metadata(self, content: str) -> Dict[str, Any]:
        """Extract common metadata from content"""
        metadata = {}

        # Try to extract date patterns
        date_patterns = [
            r'\b(\d{4}-\d{2}-\d{2})\b',  # YYYY-MM-DD
            r'\b(\d{2}/\d{2}/\d{4})\b',   # MM/DD/YYYY
            r'\b(\d{2}-\d{2}-\d{4})\b',   # DD-MM-YYYY
        ]

        for pattern in date_patterns:
            match = re.search(pattern, content)
            if match:
                try:
                    # Attempt to parse the date
                    date_str = match.group(1)
                    # Simple date parsing (could be enhanced)
                    metadata['extracted_date'] = date_str
                    break
                except:
                    pass

        # Extract emails
        email_pattern = r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b'
        emails = re.findall(email_pattern, content)
        if emails:
            metadata['emails'] = list(set(emails))

        # Extract URLs
        url_pattern = r'https?://[^\s<>"{}|\\^`\[\]]+'
        urls = re.findall(url_pattern, content)
        if urls:
            metadata['urls'] = list(set(urls))

        return metadata

    def extract_title_from_content(self, content: str) -> Optional[str]:
        """Try to extract a title from content"""
        lines = content.strip().split('\n')

        for line in lines[:10]:  # Check first 10 lines
            line = line.strip()
            if line and not line.startswith('#'):
                # Use first non-empty, non-markdown line
                if len(line) < 200:  # Reasonable title length
                    return line

        return None

    def generate_slug(self, text: str) -> str:
        """Generate a URL-friendly slug from text"""
        # Convert to lowercase
        slug = text.lower()

        # Replace spaces and special characters with hyphens
        slug = re.sub(r'[^\w\s-]', '', slug)
        slug = re.sub(r'[-\s]+', '-', slug)

        # Remove leading/trailing hyphens
        slug = slug.strip('-')

        return slug[:100]  # Limit length


class MarkdownParser(BaseParser):
    """Parser for Markdown files"""

    def __init__(self):
        super().__init__()
        self.supported_extensions = ['.md', '.markdown', '.mdown', '.mkd']
        self.supported_mimetypes = ['text/markdown', 'text/x-markdown']

    def parse(self, file_path: str) -> ExtractedContent:
        """Parse Markdown file"""
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()

            extracted = ExtractedContent(
                raw_text=content,
                format=FileFormat.MARKDOWN
            )

            # Extract front matter if present
            front_matter = self._extract_front_matter(content)
            if front_matter:
                extracted.metadata.update(front_matter)
                # Remove front matter from content
                content = re.sub(r'^---\s*\n.*?\n---\s*\n', '', content, flags=re.DOTALL)

            # Extract title (first H1 or from front matter)
            title = self._extract_title(content, front_matter)
            if title:
                extracted.title = title

            # Extract description (first paragraph after title or from front matter)
            description = self._extract_description(content, front_matter)
            if description:
                extracted.description = description

            # Extract sections
            sections = self._extract_sections(content)
            extracted.sections = sections

            # Extract images
            images = self._extract_images(content)
            extracted.images = images

            # Extract tags from content or front matter
            tags = self._extract_tags(content, front_matter)
            extracted.tags = tags

            # Extract metadata
            metadata = self.extract_metadata(content)
            extracted.metadata.update(metadata)

            # Set body (content without front matter)
            extracted.body = content

            # Extract date from front matter or content
            if front_matter and 'date' in front_matter:
                try:
                    # Try to parse date
                    extracted.date = datetime.fromisoformat(str(front_matter['date']))
                except:
                    pass

            # Extract author
            if front_matter and 'author' in front_matter:
                extracted.author = str(front_matter['author'])

            return extracted

        except Exception as e:
            logger.error(f"Error parsing Markdown file {file_path}: {str(e)}")
            return ExtractedContent(
                raw_text=f"Error parsing file: {str(e)}",
                format=FileFormat.MARKDOWN
            )

    def _extract_front_matter(self, content: str) -> Dict[str, Any]:
        """Extract YAML front matter from Markdown"""
        pattern = r'^---\s*\n(.*?)\n---\s*\n'
        match = re.match(pattern, content, re.DOTALL)

        if match:
            front_matter_text = match.group(1)
            try:
                # Simple YAML parsing (could use yaml library)
                front_matter = {}
                for line in front_matter_text.split('\n'):
                    if ':' in line:
                        key, value = line.split(':', 1)
                        key = key.strip()
                        value = value.strip()
                        # Remove quotes if present
                        if value.startswith('"') and value.endswith('"'):
                            value = value[1:-1]
                        elif value.startswith("'") and value.endswith("'"):
                            value = value[1:-1]
                        front_matter[key] = value
                return front_matter
            except:
                pass

        return {}

    def _extract_title(self, content: str, front_matter: Dict[str, Any]) -> Optional[str]:
        """Extract title from content or front matter"""
        # Check front matter first
        if front_matter and 'title' in front_matter:
            return str(front_matter['title'])

        # Look for first H1
        h1_pattern = r'^#\s+(.+)$'
        match = re.search(h1_pattern, content, re.MULTILINE)
        if match:
            return match.group(1).strip()

        # Look for first H2 if no H1
        h2_pattern = r'^##\s+(.+)$'
        match = re.search(h2_pattern, content, re.MULTILINE)
        if match:
            return match.group(1).strip()

        return None

    def _extract_description(self, content: str, front_matter: Dict[str, Any]) -> Optional[str]:
        """Extract description from content or front matter"""
        # Check front matter first
        if front_matter:
            for key in ['description', 'summary', 'excerpt']:
                if key in front_matter:
                    return str(front_matter[key])

        # Get first paragraph after title
        lines = content.split('\n')
        in_paragraph = False
        paragraph_lines = []

        for line in lines:
            line = line.strip()

            # Skip headers
            if line.startswith('#'):
                if in_paragraph:
                    break
                continue

            # Skip empty lines before paragraph
            if not line and not in_paragraph:
                continue

            # Start collecting paragraph
            if line and not in_paragraph:
                in_paragraph = True

            # Collect paragraph lines
            if in_paragraph:
                if not line:
                    break
                paragraph_lines.append(line)

        if paragraph_lines:
            description = ' '.join(paragraph_lines)
            # Limit length
            if len(description) > 500:
                description = description[:497] + '...'
            return description

        return None

    def _extract_sections(self, content: str) -> List[ContentSection]:
        """Extract sections from Markdown content"""
        sections = []

        # Split content by headers
        header_pattern = r'^(#{1,6})\s+(.+)$'

        current_section = None
        current_content = []

        for line in content.split('\n'):
            header_match = re.match(header_pattern, line)

            if header_match:
                # Save previous section
                if current_section:
                    current_section.content = '\n'.join(current_content).strip()
                    if current_section.content:
                        sections.append(current_section)

                # Start new section
                level = len(header_match.group(1))
                title = header_match.group(2).strip()
                current_section = ContentSection(
                    title=title,
                    level=level,
                    content=""
                )
                current_content = []
            else:
                current_content.append(line)

        # Save last section
        if current_section:
            current_section.content = '\n'.join(current_content).strip()
            if current_section.content:
                sections.append(current_section)

        return sections

    def _extract_images(self, content: str) -> List[ExtractedImage]:
        """Extract images from Markdown content"""
        images = []

        # Markdown image syntax: ![alt text](url "title")
        img_pattern = r'!\[([^\]]*)\]\(([^)]+)(?:\s+"([^"]+)")?\)'

        for match in re.finditer(img_pattern, content):
            alt_text = match.group(1)
            url = match.group(2)
            title = match.group(3)

            image = ExtractedImage(
                url=url if url.startswith('http') else None,
                path=url if not url.startswith('http') else None,
                alt_text=alt_text if alt_text else None,
                caption=title if title else None
            )
            images.append(image)

        return images

    def _extract_tags(self, content: str, front_matter: Dict[str, Any]) -> List[str]:
        """Extract tags from content or front matter"""
        tags = []

        # Check front matter
        if front_matter:
            for key in ['tags', 'categories', 'keywords']:
                if key in front_matter:
                    tag_value = front_matter[key]
                    if isinstance(tag_value, str):
                        # Split by comma or space
                        if ',' in tag_value:
                            tags.extend([t.strip() for t in tag_value.split(',')])
                        else:
                            tags.extend(tag_value.split())

        # Look for hashtags in content
        hashtag_pattern = r'#(\w+)'
        hashtags = re.findall(hashtag_pattern, content)
        tags.extend(hashtags)

        # Remove duplicates and return
        return list(set(tags))


class PlainTextParser(BaseParser):
    """Parser for plain text files"""

    def __init__(self):
        super().__init__()
        self.supported_extensions = ['.txt', '.text']
        self.supported_mimetypes = ['text/plain']

    def parse(self, file_path: str) -> ExtractedContent:
        """Parse plain text file"""
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()

            extracted = ExtractedContent(
                raw_text=content,
                format=FileFormat.TXT
            )

            # Extract title (first non-empty line)
            lines = content.strip().split('\n')
            if lines:
                extracted.title = lines[0].strip()

            # Extract description (next few lines)
            if len(lines) > 1:
                description_lines = []
                for line in lines[1:6]:  # Next 5 lines
                    line = line.strip()
                    if line:
                        description_lines.append(line)
                if description_lines:
                    extracted.description = ' '.join(description_lines)[:500]

            # Set body
            extracted.body = content

            # Try to extract sections by detecting patterns
            sections = self._extract_sections_heuristic(content)
            extracted.sections = sections

            # Extract metadata
            metadata = self.extract_metadata(content)
            extracted.metadata.update(metadata)

            return extracted

        except Exception as e:
            logger.error(f"Error parsing text file {file_path}: {str(e)}")
            return ExtractedContent(
                raw_text=f"Error parsing file: {str(e)}",
                format=FileFormat.TXT
            )

    def _extract_sections_heuristic(self, content: str) -> List[ContentSection]:
        """Try to detect sections in plain text using heuristics"""
        sections = []
        lines = content.split('\n')

        current_section = None
        current_content = []

        for i, line in enumerate(lines):
            # Check if line might be a header
            is_header = False

            # All caps line
            if line.strip() and line.isupper() and len(line.strip()) < 100:
                is_header = True

            # Line followed by underline (===== or -----)
            if i + 1 < len(lines):
                next_line = lines[i + 1]
                if re.match(r'^[=-]+$', next_line.strip()):
                    is_header = True

            # Numbered sections (1. Title, 2. Title, etc.)
            if re.match(r'^\d+\.\s+\w+', line):
                is_header = True

            if is_header:
                # Save previous section
                if current_section:
                    current_section.content = '\n'.join(current_content).strip()
                    if current_section.content:
                        sections.append(current_section)

                # Start new section
                current_section = ContentSection(
                    title=line.strip(),
                    level=1,
                    content=""
                )
                current_content = []
            else:
                current_content.append(line)

        # Save last section
        if current_section:
            current_section.content = '\n'.join(current_content).strip()
            if current_section.content:
                sections.append(current_section)

        return sections


class DocxParser(BaseParser):
    """Parser for Microsoft Word documents"""

    def __init__(self):
        super().__init__()
        self.supported_extensions = ['.docx']
        self.supported_mimetypes = [
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        ]

    def parse(self, file_path: str) -> ExtractedContent:
        """Parse DOCX file"""
        if not Document:
            logger.error("python-docx library not installed")
            return ExtractedContent(
                raw_text="Error: python-docx library not installed",
                format=FileFormat.DOCX
            )

        try:
            doc = Document(file_path)

            extracted = ExtractedContent(format=FileFormat.DOCX)

            # Extract all text
            full_text = []
            sections = []
            current_section = None
            current_content = []

            for para in doc.paragraphs:
                text = para.text.strip()
                if not text:
                    continue

                full_text.append(text)

                # Check if paragraph is a heading
                if para.style.name.startswith('Heading'):
                    # Save previous section
                    if current_section:
                        current_section.content = '\n'.join(current_content).strip()
                        if current_section.content:
                            sections.append(current_section)

                    # Get heading level
                    level = 1
                    if 'Heading' in para.style.name:
                        try:
                            level = int(para.style.name.replace('Heading ', ''))
                        except:
                            pass

                    # Start new section
                    current_section = ContentSection(
                        title=text,
                        level=level,
                        content=""
                    )
                    current_content = []

                    # First heading might be the title
                    if not extracted.title and level == 1:
                        extracted.title = text
                else:
                    current_content.append(text)

                    # First paragraph might be description
                    if not extracted.description and len(full_text) == 2:
                        extracted.description = text[:500]

            # Save last section
            if current_section:
                current_section.content = '\n'.join(current_content).strip()
                if current_section.content:
                    sections.append(current_section)

            # Set extracted content
            extracted.raw_text = '\n\n'.join(full_text)
            extracted.body = extracted.raw_text
            extracted.sections = sections

            # Extract document properties
            if doc.core_properties:
                props = doc.core_properties
                if props.title:
                    extracted.title = props.title
                if props.author:
                    extracted.author = props.author
                if props.created:
                    extracted.date = props.created
                if props.keywords:
                    extracted.tags = [k.strip() for k in props.keywords.split(',')]

                # Add to metadata
                extracted.metadata['document_properties'] = {
                    'title': props.title,
                    'author': props.author,
                    'subject': props.subject,
                    'keywords': props.keywords,
                    'comments': props.comments,
                    'created': str(props.created) if props.created else None,
                    'modified': str(props.modified) if props.modified else None
                }

            # Extract metadata from content
            metadata = self.extract_metadata(extracted.raw_text)
            extracted.metadata.update(metadata)

            return extracted

        except Exception as e:
            logger.error(f"Error parsing DOCX file {file_path}: {str(e)}")
            return ExtractedContent(
                raw_text=f"Error parsing file: {str(e)}",
                format=FileFormat.DOCX
            )


class PDFParser(BaseParser):
    """Parser for PDF files"""

    def __init__(self):
        super().__init__()
        self.supported_extensions = ['.pdf']
        self.supported_mimetypes = ['application/pdf']

    def parse(self, file_path: str) -> ExtractedContent:
        """Parse PDF file"""
        if not PyPDF2:
            logger.error("PyPDF2 library not installed")
            return ExtractedContent(
                raw_text="Error: PyPDF2 library not installed",
                format=FileFormat.PDF
            )

        try:
            extracted = ExtractedContent(format=FileFormat.PDF)
            full_text = []

            with open(file_path, 'rb') as f:
                reader = PyPDF2.PdfReader(f)

                # Extract metadata
                if reader.metadata:
                    meta = reader.metadata
                    if meta.title:
                        extracted.title = meta.title
                    if meta.author:
                        extracted.author = meta.author
                    if meta.creation_date:
                        try:
                            extracted.date = meta.creation_date
                        except:
                            pass

                    # Store all metadata
                    extracted.metadata['pdf_metadata'] = {
                        'title': meta.title,
                        'author': meta.author,
                        'subject': meta.subject,
                        'creator': meta.creator,
                        'producer': meta.producer,
                        'creation_date': str(meta.creation_date) if meta.creation_date else None,
                        'modification_date': str(meta.modification_date) if meta.modification_date else None
                    }

                # Extract text from all pages
                for page_num, page in enumerate(reader.pages):
                    try:
                        text = page.extract_text()
                        if text:
                            full_text.append(text)
                    except Exception as e:
                        logger.warning(f"Error extracting text from page {page_num}: {str(e)}")

            # Combine all text
            extracted.raw_text = '\n\n'.join(full_text)
            extracted.body = extracted.raw_text

            # Try to extract title from first lines if not in metadata
            if not extracted.title:
                lines = extracted.raw_text.split('\n')
                for line in lines[:10]:
                    line = line.strip()
                    if line and len(line) < 200:
                        extracted.title = line
                        break

            # Extract description
            if not extracted.description:
                # Get first substantial paragraph
                paragraphs = extracted.raw_text.split('\n\n')
                for para in paragraphs[:5]:
                    para = para.strip()
                    if len(para) > 50:
                        extracted.description = para[:500]
                        break

            # Try to detect sections (basic heuristic)
            sections = self._extract_pdf_sections(extracted.raw_text)
            extracted.sections = sections

            # Extract general metadata
            metadata = self.extract_metadata(extracted.raw_text)
            extracted.metadata.update(metadata)

            return extracted

        except Exception as e:
            logger.error(f"Error parsing PDF file {file_path}: {str(e)}")
            return ExtractedContent(
                raw_text=f"Error parsing file: {str(e)}",
                format=FileFormat.PDF
            )

    def _extract_pdf_sections(self, text: str) -> List[ContentSection]:
        """Extract sections from PDF text using heuristics"""
        sections = []
        lines = text.split('\n')

        current_section = None
        current_content = []

        for line in lines:
            line = line.strip()

            # Skip empty lines
            if not line:
                if current_content:
                    current_content.append('')
                continue

            # Check if line might be a section header
            # (ALL CAPS, short, not all numbers)
            if (line.isupper() and
                len(line) < 100 and
                not line.replace(' ', '').isdigit()):

                # Save previous section
                if current_section:
                    current_section.content = '\n'.join(current_content).strip()
                    if current_section.content:
                        sections.append(current_section)

                # Start new section
                current_section = ContentSection(
                    title=line,
                    level=1,
                    content=""
                )
                current_content = []
            else:
                current_content.append(line)

        # Save last section
        if current_section:
            current_section.content = '\n'.join(current_content).strip()
            if current_section.content:
                sections.append(current_section)

        return sections


class ImageMetadataParser(BaseParser):
    """Parser for extracting metadata from images"""

    def __init__(self):
        super().__init__()
        self.supported_extensions = [
            '.jpg', '.jpeg', '.png', '.gif', '.bmp',
            '.tiff', '.tif', '.webp', '.svg'
        ]
        self.supported_mimetypes = [
            'image/jpeg', 'image/png', 'image/gif', 'image/bmp',
            'image/tiff', 'image/webp', 'image/svg+xml'
        ]

    def parse(self, file_path: str) -> ExtractedContent:
        """Extract metadata from image file"""
        extracted = ExtractedContent(format=FileFormat.IMAGE)

        # Get basic file info
        file_name = os.path.basename(file_path)
        extracted.title = os.path.splitext(file_name)[0]

        if not Image:
            logger.warning("Pillow library not installed, limited image parsing")
            extracted.metadata['warning'] = "Pillow not installed"
            return extracted

        try:
            with Image.open(file_path) as img:
                # Basic image info
                extracted.metadata['dimensions'] = {
                    'width': img.width,
                    'height': img.height
                }
                extracted.metadata['format'] = img.format
                extracted.metadata['mode'] = img.mode

                # Create ExtractedImage
                img_info = ExtractedImage(
                    path=file_path,
                    width=img.width,
                    height=img.height,
                    format=img.format,
                    metadata={
                        'mode': img.mode,
                        'size_bytes': os.path.getsize(file_path)
                    }
                )
                extracted.images = [img_info]

                # Extract EXIF data if available
                if hasattr(img, '_getexif') and img._getexif():
                    exif_data = {}
                    exif = img._getexif()

                    for tag_id, value in exif.items():
                        if tag_id in TAGS:
                            tag = TAGS[tag_id]
                            exif_data[tag] = str(value)

                    extracted.metadata['exif'] = exif_data

                    # Extract specific useful fields
                    if 'DateTime' in exif_data:
                        try:
                            date_str = exif_data['DateTime']
                            # Parse EXIF date format (YYYY:MM:DD HH:MM:SS)
                            extracted.date = datetime.strptime(date_str, '%Y:%m:%d %H:%M:%S')
                        except:
                            pass

                    if 'Artist' in exif_data:
                        extracted.author = exif_data['Artist']
                    elif 'Copyright' in exif_data:
                        extracted.author = exif_data['Copyright']

                    # GPS data
                    if 'GPSInfo' in exif_data:
                        extracted.metadata['has_gps'] = True

                # Try to extract text from filename
                # (e.g., "portfolio-hero-image-2024.jpg" -> "Portfolio Hero Image 2024")
                name_parts = file_name.replace('-', ' ').replace('_', ' ')
                name_parts = os.path.splitext(name_parts)[0]
                extracted.description = name_parts.title()

        except Exception as e:
            logger.error(f"Error parsing image file {file_path}: {str(e)}")
            extracted.metadata['error'] = str(e)

        return extracted


class ContentParserFactory:
    """Factory for creating appropriate parser for a file"""

    def __init__(self):
        self.parsers = [
            MarkdownParser(),
            PlainTextParser(),
            DocxParser(),
            PDFParser(),
            ImageMetadataParser()
        ]

    def get_parser(self, file_path: str) -> Optional[BaseParser]:
        """Get appropriate parser for the file"""
        # Get mime type
        mime_type, _ = mimetypes.guess_type(file_path)

        # Try each parser
        for parser in self.parsers:
            if parser.can_parse(file_path, mime_type):
                return parser

        # Default to plain text parser for unknown types
        return PlainTextParser()

    def parse_file(self, file_path: str) -> ExtractedContent:
        """Parse a file using the appropriate parser"""
        parser = self.get_parser(file_path)

        if parser:
            return parser.parse(file_path)

        # Return empty content if no parser found
        return ExtractedContent(
            raw_text=f"No parser available for file: {file_path}",
            format=FileFormat.UNKNOWN
        )