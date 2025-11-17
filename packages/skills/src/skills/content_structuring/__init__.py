"""
Content Structuring Skill
Processes uploaded content files and maps them to ContentSchema entities
"""

from .skill import ContentStructuringSkill
from .models import (
    # Input Models
    ContentStructuringInput,
    UploadedFile,
    ProcessingOptions,

    # Output Models
    StructuredContentCollection,
    ContentItem,
    ItemMetadata,
    ContentSource,
    ContentMetadata,
    ProcessingStats,
    ContentRelationship,

    # Processing Models
    ExtractedContent,
    ExtractedImage,
    ContentSection,
    FileProcessingResult,
    MappingContext,
    MappingInstruction,

    # Enums
    ContentStatus,
    ContentSourceType,
    ProcessingStatus,
    FileFormat
)
from .parsers import (
    BaseParser,
    MarkdownParser,
    PlainTextParser,
    DocxParser,
    PDFParser,
    ImageMetadataParser,
    ContentParserFactory
)

__all__ = [
    # Main Skill
    'ContentStructuringSkill',

    # Input Models
    'ContentStructuringInput',
    'UploadedFile',
    'ProcessingOptions',

    # Output Models
    'StructuredContentCollection',
    'ContentItem',
    'ItemMetadata',
    'ContentSource',
    'ContentMetadata',
    'ProcessingStats',
    'ContentRelationship',

    # Processing Models
    'ExtractedContent',
    'ExtractedImage',
    'ContentSection',
    'FileProcessingResult',
    'MappingContext',
    'MappingInstruction',

    # Enums
    'ContentStatus',
    'ContentSourceType',
    'ProcessingStatus',
    'FileFormat',

    # Parsers
    'BaseParser',
    'MarkdownParser',
    'PlainTextParser',
    'DocxParser',
    'PDFParser',
    'ImageMetadataParser',
    'ContentParserFactory'
]