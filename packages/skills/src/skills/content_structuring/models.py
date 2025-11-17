"""
Pydantic models for Content Structuring Skill
Defines input/output models for content processing and mapping
"""

from typing import Dict, List, Optional, Any, Literal
from datetime import datetime
from pydantic import BaseModel, Field
from enum import Enum
import mimetypes


# Import shared types from domain_mapping (reuse common models)
from ..domain_mapping.models import (
    ContentSchema,
    EntitySchema,
    FieldSchema,
    RelationshipSchema,
    SchemaMetadata,
    GenericFieldType
)


# Enums for content processing
class ContentStatus(str, Enum):
    DRAFT = "draft"
    PUBLISHED = "published"
    ARCHIVED = "archived"


class ContentSourceType(str, Enum):
    UPLOAD = "upload"
    MIGRATION = "migration"
    MANUAL = "manual"
    API = "api"


class ProcessingStatus(str, Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"
    PARTIAL = "partial"


class FileFormat(str, Enum):
    MARKDOWN = "markdown"
    TXT = "text"
    DOCX = "docx"
    PDF = "pdf"
    HTML = "html"
    JSON = "json"
    CSV = "csv"
    IMAGE = "image"
    UNKNOWN = "unknown"


# Input Models
class UploadedFile(BaseModel):
    """Represents an uploaded file to be processed"""
    file_path: str = Field(description="Path to the uploaded file")
    original_name: str = Field(description="Original filename")
    mime_type: Optional[str] = Field(default=None, description="MIME type of the file")
    size: Optional[int] = Field(default=None, description="File size in bytes")
    metadata: Optional[Dict[str, Any]] = Field(default={}, description="Additional file metadata")


class ContentStructuringInput(BaseModel):
    """Input for content structuring operation"""
    content_schema: ContentSchema = Field(description="The schema to map content to")
    uploaded_files: List[UploadedFile] = Field(description="List of files to process")
    processing_options: Optional["ProcessingOptions"] = Field(
        default=None,
        description="Options for content processing"
    )
    context: Optional[Dict[str, Any]] = Field(
        default={},
        description="Additional context for AI processing"
    )


class ProcessingOptions(BaseModel):
    """Options for content processing"""
    auto_generate_slugs: bool = Field(default=True, description="Auto-generate slugs from titles")
    extract_relationships: bool = Field(default=True, description="Try to extract relationships between items")
    extract_metadata: bool = Field(default=True, description="Extract metadata from files")
    infer_dates: bool = Field(default=True, description="Try to infer dates from content")
    use_ai_enhancement: bool = Field(default=True, description="Use AI to enhance content extraction")
    chunk_large_files: bool = Field(default=True, description="Chunk large files for processing")
    max_chunk_size: int = Field(default=4000, description="Max chunk size in characters")
    default_status: ContentStatus = Field(default=ContentStatus.DRAFT, description="Default status for items")
    ignore_errors: bool = Field(default=True, description="Continue processing on errors")


# Output Models
class ContentSource(BaseModel):
    """Source information for content item"""
    type: ContentSourceType = ContentSourceType.UPLOAD
    reference: Optional[str] = Field(default=None, description="Original file path or reference")
    original_format: Optional[str] = Field(default=None, description="Original file format")


class ItemMetadata(BaseModel):
    """Metadata for a content item"""
    slug: Optional[str] = None
    status: ContentStatus = ContentStatus.DRAFT
    created_at: datetime = Field(default_factory=datetime.now, alias="createdAt")
    updated_at: datetime = Field(default_factory=datetime.now, alias="updatedAt")
    published_at: Optional[datetime] = Field(default=None, alias="publishedAt")
    author: Optional[str] = None
    source: Optional[ContentSource] = None

    class Config:
        populate_by_name = True


class ContentItem(BaseModel):
    """Individual content item"""
    id: str
    entity_type: str = Field(alias="entityType", description="Reference to EntitySchema.id")
    fields: Dict[str, Any] = Field(description="Field values mapped to schema")
    metadata: ItemMetadata
    relationships: Optional[List["ContentRelationship"]] = Field(default=[], description="Related content items")

    class Config:
        populate_by_name = True


class ContentRelationship(BaseModel):
    """Relationship between content items"""
    relationship_id: str = Field(alias="relationshipId", description="Reference to RelationshipSchema.id")
    target_item_id: str = Field(alias="targetItemId", description="ID of the related content item")
    metadata: Optional[Dict[str, Any]] = Field(default={}, description="Additional relationship metadata")

    class Config:
        populate_by_name = True


class ContentMetadata(BaseModel):
    """Metadata for the content collection"""
    generated_at: datetime = Field(default_factory=datetime.now, alias="generatedAt")
    generator: str = Field(default="content_structuring_skill")
    version: str = Field(default="1.0.0")
    processing_stats: Optional["ProcessingStats"] = Field(default=None, alias="processingStats")

    class Config:
        populate_by_name = True


class ProcessingStats(BaseModel):
    """Statistics about the processing operation"""
    total_files: int = Field(alias="totalFiles")
    processed_files: int = Field(alias="processedFiles")
    failed_files: int = Field(alias="failedFiles")
    total_items: int = Field(alias="totalItems")
    items_by_entity: Dict[str, int] = Field(alias="itemsByEntity")
    processing_time_ms: Optional[int] = Field(default=None, alias="processingTimeMs")
    errors: List[str] = Field(default=[])
    warnings: List[str] = Field(default=[])

    class Config:
        populate_by_name = True


class StructuredContentCollection(BaseModel):
    """The main output - structured content mapped to schema"""
    schema: ContentSchema
    content: Dict[str, List[ContentItem]] = Field(description="Entity ID -> Content Items")
    metadata: ContentMetadata


# Processing Models
class ExtractedContent(BaseModel):
    """Raw extracted content from a file"""
    title: Optional[str] = None
    description: Optional[str] = None
    body: Optional[str] = None
    date: Optional[datetime] = None
    author: Optional[str] = None
    tags: List[str] = Field(default=[])
    categories: List[str] = Field(default=[])
    images: List["ExtractedImage"] = Field(default=[])
    metadata: Dict[str, Any] = Field(default={})
    raw_text: str = Field(default="")
    format: FileFormat = FileFormat.UNKNOWN
    sections: List["ContentSection"] = Field(default=[])


class ContentSection(BaseModel):
    """A section within extracted content"""
    title: Optional[str] = None
    content: str
    level: int = Field(default=1, description="Heading level (1-6)")
    metadata: Dict[str, Any] = Field(default={})


class ExtractedImage(BaseModel):
    """Extracted image information"""
    path: Optional[str] = None
    url: Optional[str] = None
    alt_text: Optional[str] = None
    caption: Optional[str] = None
    width: Optional[int] = None
    height: Optional[int] = None
    format: Optional[str] = None
    metadata: Dict[str, Any] = Field(default={})


class FileProcessingResult(BaseModel):
    """Result from processing a single file"""
    file_path: str
    status: ProcessingStatus
    extracted_content: Optional[ExtractedContent] = None
    mapped_items: List[ContentItem] = Field(default=[])
    errors: List[str] = Field(default=[])
    warnings: List[str] = Field(default=[])
    processing_time_ms: Optional[int] = None


class MappingContext(BaseModel):
    """Context for AI-based content mapping"""
    content_schema: ContentSchema
    extracted_content: ExtractedContent
    existing_items: List[ContentItem] = Field(default=[])
    user_context: Dict[str, Any] = Field(default={})


class MappingInstruction(BaseModel):
    """Instructions from AI for mapping content to schema"""
    entity_type: str = Field(description="Which entity to map this content to")
    field_mappings: Dict[str, Any] = Field(description="How to map content to entity fields")
    suggested_slug: Optional[str] = None
    suggested_relationships: List[Dict[str, str]] = Field(default=[])
    confidence_score: Optional[float] = Field(default=None, description="0-1 confidence in mapping")
    reasoning: Optional[str] = Field(default=None, description="Explanation of mapping decisions")


# Update forward references
ContentItem.model_rebuild()
ContentRelationship.model_rebuild()
ExtractedContent.model_rebuild()