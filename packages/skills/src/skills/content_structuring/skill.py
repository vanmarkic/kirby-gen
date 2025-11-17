"""
Content Structuring Skill - Maps uploaded content to ContentSchema entities
Uses Claude to intelligently process and structure various content formats
"""

import json
import asyncio
import logging
import os
import re
from typing import Dict, List, Optional, Any, Tuple
from datetime import datetime
from pathlib import Path
import hashlib
import uuid

from anthropic import AsyncAnthropic, Anthropic

from .models import (
    ContentStructuringInput,
    StructuredContentCollection,
    ContentItem,
    ItemMetadata,
    ContentSource,
    ContentStatus,
    ContentSourceType,
    ContentMetadata,
    ProcessingStats,
    ProcessingOptions,
    UploadedFile,
    ExtractedContent,
    FileProcessingResult,
    ProcessingStatus,
    MappingContext,
    MappingInstruction,
    ContentRelationship,
    FileFormat
)
from .parsers import ContentParserFactory

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Claude model to use
CLAUDE_MODEL = "claude-3-opus-20240229"  # Or use newer model when available


class ContentStructuringSkill:
    """
    AI-powered content structuring skill that processes uploaded files
    and maps them to a defined ContentSchema
    """

    def __init__(self, api_key: str):
        """
        Initialize the Content Structuring Skill

        Args:
            api_key: Anthropic API key for Claude access
        """
        self.client = AsyncAnthropic(api_key=api_key)
        self.sync_client = Anthropic(api_key=api_key)
        self.parser_factory = ContentParserFactory()
        self.processed_items: Dict[str, ContentItem] = {}

    async def process_content(
        self,
        input_data: ContentStructuringInput
    ) -> StructuredContentCollection:
        """
        Process uploaded content files and map them to the schema

        Args:
            input_data: Input containing schema and files to process

        Returns:
            Structured content collection mapped to schema
        """
        start_time = datetime.now()

        # Get processing options
        options = input_data.processing_options or ProcessingOptions()

        # Initialize stats
        stats = ProcessingStats(
            totalFiles=len(input_data.uploaded_files),
            processedFiles=0,
            failedFiles=0,
            totalItems=0,
            itemsByEntity={},
            errors=[],
            warnings=[]
        )

        # Process each file
        all_items: List[ContentItem] = []
        file_results: List[FileProcessingResult] = []

        for uploaded_file in input_data.uploaded_files:
            try:
                logger.info(f"Processing file: {uploaded_file.original_name}")

                # Process single file
                result = await self._process_single_file(
                    uploaded_file,
                    input_data.content_schema,
                    options,
                    input_data.context
                )

                file_results.append(result)

                if result.status == ProcessingStatus.COMPLETED:
                    stats.processedFiles += 1
                    all_items.extend(result.mapped_items)
                elif result.status == ProcessingStatus.PARTIAL:
                    stats.processedFiles += 1
                    all_items.extend(result.mapped_items)
                    stats.warnings.extend(result.warnings)
                else:
                    stats.failedFiles += 1
                    stats.errors.extend(result.errors)

            except Exception as e:
                logger.error(f"Error processing file {uploaded_file.original_name}: {str(e)}")
                stats.failedFiles += 1
                stats.errors.append(f"Failed to process {uploaded_file.original_name}: {str(e)}")

                if not options.ignore_errors:
                    raise

        # Extract relationships between items if enabled
        if options.extract_relationships and len(all_items) > 1:
            try:
                relationships = await self._extract_relationships(
                    all_items,
                    input_data.content_schema
                )

                # Add relationships to items
                for rel in relationships:
                    item_id = rel['source_item_id']
                    item = next((i for i in all_items if i.id == item_id), None)
                    if item:
                        item.relationships.append(ContentRelationship(
                            relationshipId=rel['relationship_id'],
                            targetItemId=rel['target_item_id'],
                            metadata=rel.get('metadata', {})
                        ))

            except Exception as e:
                logger.warning(f"Failed to extract relationships: {str(e)}")
                stats.warnings.append(f"Relationship extraction failed: {str(e)}")

        # Organize items by entity type
        content_by_entity: Dict[str, List[ContentItem]] = {}
        for item in all_items:
            entity_type = item.entity_type
            if entity_type not in content_by_entity:
                content_by_entity[entity_type] = []
            content_by_entity[entity_type].append(item)

        # Update stats
        stats.totalItems = len(all_items)
        for entity_type, items in content_by_entity.items():
            stats.itemsByEntity[entity_type] = len(items)

        # Calculate processing time
        processing_time = (datetime.now() - start_time).total_seconds() * 1000
        stats.processingTimeMs = int(processing_time)

        # Create metadata
        metadata = ContentMetadata(
            generatedAt=datetime.now(),
            generator="content_structuring_skill",
            version="1.0.0",
            processingStats=stats
        )

        # Return structured collection
        return StructuredContentCollection(
            schema=input_data.content_schema,
            content=content_by_entity,
            metadata=metadata
        )

    async def _process_single_file(
        self,
        uploaded_file: UploadedFile,
        schema: Any,  # ContentSchema
        options: ProcessingOptions,
        context: Dict[str, Any]
    ) -> FileProcessingResult:
        """
        Process a single uploaded file

        Args:
            uploaded_file: File to process
            schema: Content schema to map to
            options: Processing options
            context: Additional context

        Returns:
            Processing result for the file
        """
        file_start = datetime.now()

        result = FileProcessingResult(
            file_path=uploaded_file.file_path,
            status=ProcessingStatus.PROCESSING,
            mapped_items=[],
            errors=[],
            warnings=[]
        )

        try:
            # Step 1: Parse the file to extract content
            extracted_content = self.parser_factory.parse_file(uploaded_file.file_path)
            result.extracted_content = extracted_content

            if not extracted_content or not extracted_content.raw_text:
                result.status = ProcessingStatus.FAILED
                result.errors.append("No content could be extracted from file")
                return result

            # Step 2: Use AI to map content to schema if enabled
            if options.use_ai_enhancement:
                # Handle large content by chunking if needed
                if options.chunk_large_files and len(extracted_content.raw_text) > options.max_chunk_size:
                    # Process in chunks
                    mapped_items = await self._process_large_content(
                        extracted_content,
                        schema,
                        options,
                        uploaded_file,
                        context
                    )
                else:
                    # Process entire content at once
                    mapping_context = MappingContext(
                        content_schema=schema,
                        extracted_content=extracted_content,
                        existing_items=list(self.processed_items.values()),
                        user_context=context
                    )

                    mapping_instructions = await self._get_ai_mapping(mapping_context)

                    if mapping_instructions:
                        mapped_items = self._create_items_from_instructions(
                            [mapping_instructions],
                            extracted_content,
                            uploaded_file,
                            options
                        )
                    else:
                        # Fallback to heuristic mapping
                        mapped_items = self._heuristic_mapping(
                            extracted_content,
                            schema,
                            uploaded_file,
                            options
                        )
            else:
                # Use heuristic mapping without AI
                mapped_items = self._heuristic_mapping(
                    extracted_content,
                    schema,
                    uploaded_file,
                    options
                )

            # Add mapped items to result
            result.mapped_items = mapped_items

            # Store processed items for relationship extraction
            for item in mapped_items:
                self.processed_items[item.id] = item

            # Set status
            if mapped_items:
                result.status = ProcessingStatus.COMPLETED
            else:
                result.status = ProcessingStatus.PARTIAL
                result.warnings.append("No items could be mapped from content")

        except Exception as e:
            logger.error(f"Error processing file {uploaded_file.file_path}: {str(e)}")
            result.status = ProcessingStatus.FAILED
            result.errors.append(str(e))

        # Calculate processing time
        result.processing_time_ms = int((datetime.now() - file_start).total_seconds() * 1000)

        return result

    async def _get_ai_mapping(
        self,
        context: MappingContext
    ) -> Optional[MappingInstruction]:
        """
        Use Claude to map extracted content to schema

        Args:
            context: Mapping context with schema and content

        Returns:
            Mapping instructions from AI
        """
        try:
            # Prepare schema summary for prompt
            schema_summary = self._summarize_schema(context.content_schema)

            # Prepare content summary
            content_summary = self._summarize_content(context.extracted_content)

            # Create prompt for Claude
            prompt = f"""You are an expert at structuring content according to schemas.

Given the following content schema:
{schema_summary}

And this extracted content:
{content_summary}

Please determine:
1. Which entity type this content should be mapped to
2. How to map the content to the entity's fields
3. A suggested URL slug
4. Any relationships to existing items

Existing items for context:
{json.dumps([{'id': item.id, 'type': item.entity_type, 'title': item.fields.get('title', 'Untitled')}
             for item in context.existing_items[:10]], indent=2)}

Return your response as JSON in this format:
{{
    "entity_type": "entity_id_from_schema",
    "field_mappings": {{
        "field_name": "extracted value",
        "another_field": "another value"
    }},
    "suggested_slug": "url-friendly-slug",
    "suggested_relationships": [
        {{
            "target_item_id": "existing_item_id",
            "relationship_type": "relationship_id_from_schema"
        }}
    ],
    "confidence_score": 0.0-1.0,
    "reasoning": "Brief explanation of mapping decisions"
}}
"""

            # Call Claude
            message = await self.client.messages.create(
                model=CLAUDE_MODEL,
                max_tokens=2000,
                temperature=0.3,
                system="You are a content structuring expert. Always return valid JSON.",
                messages=[{"role": "user", "content": prompt}]
            )

            # Parse response
            response_text = message.content[0].text

            # Extract JSON from response
            json_match = re.search(r'\{.*\}', response_text, re.DOTALL)
            if json_match:
                mapping_data = json.loads(json_match.group())

                return MappingInstruction(
                    entity_type=mapping_data.get('entity_type'),
                    field_mappings=mapping_data.get('field_mappings', {}),
                    suggested_slug=mapping_data.get('suggested_slug'),
                    suggested_relationships=mapping_data.get('suggested_relationships', []),
                    confidence_score=mapping_data.get('confidence_score'),
                    reasoning=mapping_data.get('reasoning')
                )

        except Exception as e:
            logger.error(f"AI mapping failed: {str(e)}")

        return None

    async def _process_large_content(
        self,
        extracted_content: ExtractedContent,
        schema: Any,
        options: ProcessingOptions,
        uploaded_file: UploadedFile,
        context: Dict[str, Any]
    ) -> List[ContentItem]:
        """
        Process large content by chunking

        Args:
            extracted_content: Extracted content to process
            schema: Content schema
            options: Processing options
            uploaded_file: Original file
            context: Additional context

        Returns:
            List of mapped content items
        """
        items = []

        # Split content into chunks
        chunks = self._chunk_content(extracted_content, options.max_chunk_size)

        for i, chunk in enumerate(chunks):
            # Create extracted content for chunk
            chunk_content = ExtractedContent(
                title=f"{extracted_content.title} - Part {i+1}" if extracted_content.title else f"Part {i+1}",
                description=extracted_content.description if i == 0 else None,
                body=chunk,
                raw_text=chunk,
                format=extracted_content.format,
                metadata=extracted_content.metadata.copy()
            )

            # Get mapping for chunk
            mapping_context = MappingContext(
                content_schema=schema,
                extracted_content=chunk_content,
                existing_items=list(self.processed_items.values()) + items,
                user_context=context
            )

            mapping_instruction = await self._get_ai_mapping(mapping_context)

            if mapping_instruction:
                chunk_items = self._create_items_from_instructions(
                    [mapping_instruction],
                    chunk_content,
                    uploaded_file,
                    options
                )
                items.extend(chunk_items)

        return items

    def _chunk_content(self, content: ExtractedContent, max_size: int) -> List[str]:
        """
        Split content into chunks

        Args:
            content: Content to chunk
            max_size: Maximum chunk size

        Returns:
            List of content chunks
        """
        text = content.raw_text
        chunks = []

        # Try to split on paragraphs first
        paragraphs = text.split('\n\n')

        current_chunk = []
        current_size = 0

        for para in paragraphs:
            para_size = len(para)

            if current_size + para_size > max_size and current_chunk:
                # Save current chunk
                chunks.append('\n\n'.join(current_chunk))
                current_chunk = [para]
                current_size = para_size
            else:
                current_chunk.append(para)
                current_size += para_size

        # Add remaining chunk
        if current_chunk:
            chunks.append('\n\n'.join(current_chunk))

        # If we have chunks that are still too large, split them further
        final_chunks = []
        for chunk in chunks:
            if len(chunk) > max_size:
                # Split by sentences
                sentences = re.split(r'(?<=[.!?])\s+', chunk)
                sub_chunk = []
                sub_size = 0

                for sentence in sentences:
                    if sub_size + len(sentence) > max_size and sub_chunk:
                        final_chunks.append(' '.join(sub_chunk))
                        sub_chunk = [sentence]
                        sub_size = len(sentence)
                    else:
                        sub_chunk.append(sentence)
                        sub_size += len(sentence)

                if sub_chunk:
                    final_chunks.append(' '.join(sub_chunk))
            else:
                final_chunks.append(chunk)

        return final_chunks

    def _heuristic_mapping(
        self,
        extracted_content: ExtractedContent,
        schema: Any,
        uploaded_file: UploadedFile,
        options: ProcessingOptions
    ) -> List[ContentItem]:
        """
        Map content using heuristics (fallback when AI is not available)

        Args:
            extracted_content: Extracted content
            schema: Content schema
            uploaded_file: Original file
            options: Processing options

        Returns:
            List of mapped content items
        """
        items = []

        # Try to determine entity type based on content
        entity_type = self._guess_entity_type(extracted_content, schema)

        if not entity_type:
            # Default to first entity in schema
            if schema.entities:
                entity_type = schema.entities[0].id
            else:
                logger.warning("No entities in schema")
                return items

        # Get entity schema
        entity_schema = next(
            (e for e in schema.entities if e.id == entity_type),
            None
        )

        if not entity_schema:
            logger.warning(f"Entity type {entity_type} not found in schema")
            return items

        # Map fields
        field_mappings = {}

        for field in entity_schema.fields:
            field_name = field.name
            field_type = field.type

            # Try to map based on field name and type
            value = self._extract_field_value(
                field_name,
                field_type,
                extracted_content
            )

            if value is not None:
                field_mappings[field_name] = value
            elif field.required:
                # Use default or placeholder for required fields
                field_mappings[field_name] = self._get_default_value(field_type)

        # Generate slug
        slug = None
        if options.auto_generate_slugs:
            if extracted_content.title:
                slug = self._generate_slug(extracted_content.title)
            elif 'title' in field_mappings:
                slug = self._generate_slug(str(field_mappings['title']))

        # Create content item
        item = ContentItem(
            id=self._generate_id(),
            entityType=entity_type,
            fields=field_mappings,
            metadata=ItemMetadata(
                slug=slug,
                status=options.default_status,
                createdAt=datetime.now(),
                updatedAt=datetime.now(),
                author=extracted_content.author,
                source=ContentSource(
                    type=ContentSourceType.UPLOAD,
                    reference=uploaded_file.file_path,
                    original_format=extracted_content.format.value
                )
            ),
            relationships=[]
        )

        items.append(item)

        # If content has sections, potentially create multiple items
        if extracted_content.sections and len(extracted_content.sections) > 1:
            # Check if there's a suitable entity for sections
            section_entity = self._find_section_entity(schema)

            if section_entity:
                for section in extracted_content.sections:
                    section_item = self._create_section_item(
                        section,
                        section_entity,
                        item.id,
                        uploaded_file,
                        options
                    )
                    if section_item:
                        items.append(section_item)

        return items

    def _create_items_from_instructions(
        self,
        instructions: List[MappingInstruction],
        extracted_content: ExtractedContent,
        uploaded_file: UploadedFile,
        options: ProcessingOptions
    ) -> List[ContentItem]:
        """
        Create content items from AI mapping instructions

        Args:
            instructions: Mapping instructions from AI
            extracted_content: Extracted content
            uploaded_file: Original file
            options: Processing options

        Returns:
            List of content items
        """
        items = []

        for instruction in instructions:
            # Generate slug if not provided
            slug = instruction.suggested_slug
            if not slug and options.auto_generate_slugs:
                title = instruction.field_mappings.get('title', '')
                if title:
                    slug = self._generate_slug(str(title))

            # Create content item
            item = ContentItem(
                id=self._generate_id(),
                entityType=instruction.entity_type,
                fields=instruction.field_mappings,
                metadata=ItemMetadata(
                    slug=slug,
                    status=options.default_status,
                    createdAt=datetime.now(),
                    updatedAt=datetime.now(),
                    author=extracted_content.author,
                    source=ContentSource(
                        type=ContentSourceType.UPLOAD,
                        reference=uploaded_file.file_path,
                        original_format=extracted_content.format.value
                    )
                ),
                relationships=[]
            )

            # Add confidence to metadata if available
            if instruction.confidence_score:
                item.metadata.source.metadata = {'confidence': instruction.confidence_score}

            items.append(item)

        return items

    async def _extract_relationships(
        self,
        items: List[ContentItem],
        schema: Any
    ) -> List[Dict[str, Any]]:
        """
        Extract relationships between content items using AI

        Args:
            items: Content items to analyze
            schema: Content schema with relationship definitions

        Returns:
            List of discovered relationships
        """
        if not schema.relationships:
            return []

        try:
            # Prepare items summary
            items_summary = []
            for item in items[:50]:  # Limit to prevent prompt overflow
                items_summary.append({
                    'id': item.id,
                    'type': item.entity_type,
                    'title': item.fields.get('title', 'Untitled'),
                    'description': item.fields.get('description', '')[:100]
                })

            # Prepare relationships summary
            relationships_summary = []
            for rel in schema.relationships:
                relationships_summary.append({
                    'id': rel.id,
                    'type': rel.type,
                    'from': rel.from_entity,
                    'to': rel.to_entity,
                    'label': rel.label
                })

            prompt = f"""Analyze these content items and identify relationships between them.

Available relationship types:
{json.dumps(relationships_summary, indent=2)}

Content items:
{json.dumps(items_summary, indent=2)}

Identify which items are related based on their content, titles, and descriptions.
Return a JSON array of relationships in this format:
[
    {{
        "source_item_id": "item_id",
        "target_item_id": "item_id",
        "relationship_id": "relationship_id_from_schema",
        "confidence": 0.0-1.0,
        "reason": "brief explanation"
    }}
]

Only include relationships with confidence > 0.7."""

            message = await self.client.messages.create(
                model=CLAUDE_MODEL,
                max_tokens=2000,
                temperature=0.3,
                system="You are a content relationship analyzer. Return valid JSON.",
                messages=[{"role": "user", "content": prompt}]
            )

            response_text = message.content[0].text

            # Extract JSON
            json_match = re.search(r'\[.*\]', response_text, re.DOTALL)
            if json_match:
                relationships = json.loads(json_match.group())

                # Filter by confidence
                filtered = [r for r in relationships if r.get('confidence', 0) > 0.7]

                return filtered

        except Exception as e:
            logger.error(f"Failed to extract relationships: {str(e)}")

        return []

    def _summarize_schema(self, schema: Any) -> str:
        """Create a summary of the schema for AI prompts"""
        summary = []
        summary.append(f"Schema: {schema.metadata.name}")
        summary.append(f"Description: {schema.metadata.description}")
        summary.append("\nEntities:")

        for entity in schema.entities:
            summary.append(f"\n- {entity.name} (ID: {entity.id})")
            if entity.description:
                summary.append(f"  Description: {entity.description}")
            summary.append("  Fields:")
            for field in entity.fields[:10]:  # Limit fields
                req = "required" if field.required else "optional"
                summary.append(f"    - {field.name} ({field.type.value}, {req})")

        if schema.relationships:
            summary.append("\nRelationships:")
            for rel in schema.relationships:
                summary.append(f"- {rel.from_entity} -> {rel.to_entity} ({rel.type})")

        return '\n'.join(summary)

    def _summarize_content(self, content: ExtractedContent) -> str:
        """Create a summary of extracted content for AI prompts"""
        summary = []

        if content.title:
            summary.append(f"Title: {content.title}")
        if content.description:
            summary.append(f"Description: {content.description}")
        if content.author:
            summary.append(f"Author: {content.author}")
        if content.date:
            summary.append(f"Date: {content.date}")
        if content.tags:
            summary.append(f"Tags: {', '.join(content.tags)}")

        summary.append(f"\nContent Preview (first 500 chars):")
        summary.append(content.raw_text[:500])

        if content.sections:
            summary.append(f"\nSections ({len(content.sections)}):")
            for section in content.sections[:5]:
                summary.append(f"- {section.title or 'Untitled'} (Level {section.level})")

        if content.images:
            summary.append(f"\nImages ({len(content.images)}):")
            for img in content.images[:3]:
                summary.append(f"- {img.alt_text or img.caption or 'No description'}")

        if content.metadata:
            summary.append(f"\nMetadata fields: {', '.join(content.metadata.keys())}")

        return '\n'.join(summary)

    def _guess_entity_type(self, content: ExtractedContent, schema: Any) -> Optional[str]:
        """Guess the entity type based on content characteristics"""
        # Simple heuristics - could be enhanced
        content_lower = (content.raw_text[:1000]).lower()

        for entity in schema.entities:
            entity_name_lower = entity.name.lower()

            # Check if entity name appears in content
            if entity_name_lower in content_lower:
                return entity.id

            # Check for plural form
            if entity.plural_name.lower() in content_lower:
                return entity.id

            # Check description keywords
            if entity.description:
                keywords = entity.description.lower().split()
                if any(keyword in content_lower for keyword in keywords):
                    return entity.id

        return None

    def _extract_field_value(
        self,
        field_name: str,
        field_type: Any,
        content: ExtractedContent
    ) -> Optional[Any]:
        """Extract value for a field from content"""
        # Map common field names
        field_lower = field_name.lower()

        # Direct mappings
        if field_lower == 'title' and content.title:
            return content.title
        if field_lower in ['description', 'summary', 'excerpt'] and content.description:
            return content.description
        if field_lower in ['content', 'body', 'text']:
            return content.body or content.raw_text
        if field_lower in ['author', 'creator'] and content.author:
            return content.author
        if field_lower in ['date', 'created_date', 'publish_date'] and content.date:
            return content.date.isoformat()
        if field_lower in ['tags', 'keywords'] and content.tags:
            return content.tags
        if field_lower in ['categories'] and content.categories:
            return content.categories

        # Image fields
        if field_lower in ['image', 'featured_image', 'thumbnail'] and content.images:
            first_image = content.images[0]
            return first_image.url or first_image.path

        if field_lower == 'images' and content.images:
            return [img.url or img.path for img in content.images]

        # Check metadata
        if field_name in content.metadata:
            return content.metadata[field_name]

        return None

    def _get_default_value(self, field_type: Any) -> Any:
        """Get default value for a field type"""
        type_str = field_type.value if hasattr(field_type, 'value') else str(field_type)

        defaults = {
            'text': '',
            'textarea': '',
            'richtext': '',
            'markdown': '',
            'number': 0,
            'boolean': False,
            'date': datetime.now().isoformat(),
            'datetime': datetime.now().isoformat(),
            'list': [],
            'tags': [],
            'json': {},
            'url': '',
            'email': ''
        }

        return defaults.get(type_str, '')

    def _find_section_entity(self, schema: Any) -> Optional[Any]:
        """Find an entity suitable for content sections"""
        # Look for entities that might represent sections/chapters/parts
        section_keywords = ['section', 'chapter', 'part', 'segment', 'block']

        for entity in schema.entities:
            entity_lower = entity.name.lower()
            if any(keyword in entity_lower for keyword in section_keywords):
                return entity

        return None

    def _create_section_item(
        self,
        section: Any,
        entity_schema: Any,
        parent_id: str,
        uploaded_file: UploadedFile,
        options: ProcessingOptions
    ) -> Optional[ContentItem]:
        """Create a content item from a section"""
        if not section.content:
            return None

        # Map section to entity fields
        field_mappings = {}

        for field in entity_schema.fields:
            field_name = field.name.lower()

            if field_name in ['title', 'name', 'heading']:
                field_mappings[field.name] = section.title or f"Section {section.level}"
            elif field_name in ['content', 'body', 'text']:
                field_mappings[field.name] = section.content
            elif field_name in ['level', 'depth']:
                field_mappings[field.name] = section.level
            elif field_name in ['parent', 'parent_id']:
                field_mappings[field.name] = parent_id

        # Generate slug
        slug = None
        if options.auto_generate_slugs and section.title:
            slug = self._generate_slug(section.title)

        return ContentItem(
            id=self._generate_id(),
            entityType=entity_schema.id,
            fields=field_mappings,
            metadata=ItemMetadata(
                slug=slug,
                status=options.default_status,
                createdAt=datetime.now(),
                updatedAt=datetime.now(),
                source=ContentSource(
                    type=ContentSourceType.UPLOAD,
                    reference=uploaded_file.file_path,
                    original_format="section"
                )
            ),
            relationships=[
                ContentRelationship(
                    relationshipId="parent_child",
                    targetItemId=parent_id,
                    metadata={'type': 'parent'}
                )
            ]
        )

    def _generate_slug(self, text: str) -> str:
        """Generate a URL-friendly slug from text"""
        # Convert to lowercase
        slug = text.lower()

        # Replace spaces and special characters
        slug = re.sub(r'[^\w\s-]', '', slug)
        slug = re.sub(r'[-\s]+', '-', slug)

        # Remove leading/trailing hyphens
        slug = slug.strip('-')

        return slug[:100]  # Limit length

    def _generate_id(self) -> str:
        """Generate a unique ID for a content item"""
        return str(uuid.uuid4())

    async def validate_schema(self, schema: Any) -> List[str]:
        """
        Validate that a schema is suitable for content structuring

        Args:
            schema: Content schema to validate

        Returns:
            List of validation issues (empty if valid)
        """
        issues = []

        # Check for entities
        if not schema.entities or len(schema.entities) == 0:
            issues.append("Schema must have at least one entity")

        # Check each entity
        for entity in schema.entities:
            if not entity.id:
                issues.append(f"Entity {entity.name} missing ID")
            if not entity.name:
                issues.append(f"Entity missing name")
            if not entity.fields or len(entity.fields) == 0:
                issues.append(f"Entity {entity.name} has no fields")

            # Check for at least one text field for content
            text_fields = [f for f in entity.fields
                          if f.type in ['text', 'textarea', 'richtext', 'markdown']]
            if not text_fields:
                issues.append(f"Entity {entity.name} should have at least one text field")

        return issues