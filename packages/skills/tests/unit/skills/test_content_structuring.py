"""
Unit tests for Content Structuring Skill
Tests parsing, content extraction, mapping logic, and schema integration
"""

import pytest
import asyncio
import os
import tempfile
from datetime import datetime
from pathlib import Path
from unittest.mock import Mock, patch, AsyncMock
import json

# Import components to test
from skills.content_structuring import (
    ContentStructuringSkill,
    ContentStructuringInput,
    ProcessingOptions,
    UploadedFile,
    ExtractedContent,
    ContentItem,
    StructuredContentCollection,
    ContentStatus,
    FileFormat,

    # Parsers
    MarkdownParser,
    PlainTextParser,
    DocxParser,
    PDFParser,
    ImageMetadataParser,
    ContentParserFactory
)

# Import schema models from domain_mapping
from skills.domain_mapping.models import (
    ContentSchema,
    EntitySchema,
    FieldSchema,
    RelationshipSchema,
    SchemaMetadata,
    GenericFieldType
)


# Test fixtures
@pytest.fixture
def sample_schema():
    """Create a sample content schema for testing"""
    return ContentSchema(
        version="1.0.0",
        entities=[
            EntitySchema(
                id="project",
                name="Project",
                plural_name="Projects",
                description="Portfolio project",
                fields=[
                    FieldSchema(
                        id="title",
                        name="title",
                        label="Title",
                        type=GenericFieldType.TEXT,
                        required=True
                    ),
                    FieldSchema(
                        id="description",
                        name="description",
                        label="Description",
                        type=GenericFieldType.TEXTAREA,
                        required=False
                    ),
                    FieldSchema(
                        id="content",
                        name="content",
                        label="Content",
                        type=GenericFieldType.RICHTEXT,
                        required=False
                    ),
                    FieldSchema(
                        id="date",
                        name="date",
                        label="Date",
                        type=GenericFieldType.DATE,
                        required=False
                    ),
                    FieldSchema(
                        id="tags",
                        name="tags",
                        label="Tags",
                        type=GenericFieldType.TAGS,
                        required=False
                    )
                ],
                slug_source="title",
                timestamps=True
            ),
            EntitySchema(
                id="blog_post",
                name="Blog Post",
                plural_name="Blog Posts",
                description="Blog article",
                fields=[
                    FieldSchema(
                        id="title",
                        name="title",
                        label="Title",
                        type=GenericFieldType.TEXT,
                        required=True
                    ),
                    FieldSchema(
                        id="content",
                        name="content",
                        label="Content",
                        type=GenericFieldType.MARKDOWN,
                        required=True
                    ),
                    FieldSchema(
                        id="author",
                        name="author",
                        label="Author",
                        type=GenericFieldType.TEXT,
                        required=False
                    )
                ]
            )
        ],
        relationships=[
            RelationshipSchema(
                id="project_tags",
                type="one-to-many",
                from_entity="project",
                to_entity="tag",
                label="Has tags"
            )
        ],
        metadata=SchemaMetadata(
            name="Test Portfolio Schema",
            description="Schema for testing",
            author="Test",
            created_at=datetime.now(),
            updated_at=datetime.now()
        )
    )


@pytest.fixture
def temp_files():
    """Create temporary test files"""
    files = {}

    with tempfile.TemporaryDirectory() as tmpdir:
        # Create Markdown file
        md_path = os.path.join(tmpdir, "test.md")
        with open(md_path, 'w') as f:
            f.write("""---
title: Test Project
author: John Doe
date: 2024-01-01
tags: web, design, react
---

# Test Project

This is a test project description.

## Overview

This project demonstrates modern web development.

### Technologies Used

- React
- TypeScript
- Tailwind CSS

![Screenshot](./screenshot.png "Project screenshot")
""")
        files['markdown'] = md_path

        # Create plain text file
        txt_path = os.path.join(tmpdir, "content.txt")
        with open(txt_path, 'w') as f:
            f.write("""Important Document

This is the first paragraph of the document.
It contains some important information.

SECTION ONE
===========
This is section one content.

SECTION TWO
-----------
This is section two content.

Contact: test@example.com
Website: https://example.com
Date: 2024-01-15
""")
        files['text'] = txt_path

        # Create JSON file for testing
        json_path = os.path.join(tmpdir, "data.json")
        with open(json_path, 'w') as f:
            json.dump({
                "title": "JSON Content",
                "description": "Test JSON data",
                "items": ["item1", "item2", "item3"]
            }, f)
        files['json'] = json_path

        yield files


# Parser Tests

class TestMarkdownParser:
    """Test Markdown parsing functionality"""

    def test_can_parse(self):
        """Test file type detection"""
        parser = MarkdownParser()

        assert parser.can_parse("test.md") == True
        assert parser.can_parse("test.markdown") == True
        assert parser.can_parse("test.txt") == False
        assert parser.can_parse("test.md", "text/markdown") == True

    def test_parse_markdown_with_frontmatter(self, temp_files):
        """Test parsing Markdown with YAML frontmatter"""
        parser = MarkdownParser()
        result = parser.parse(temp_files['markdown'])

        assert result.title == "Test Project"
        assert result.author == "John Doe"
        assert result.date is not None
        assert "web" in result.tags
        assert "design" in result.tags
        assert "react" in result.tags
        assert result.format == FileFormat.MARKDOWN

    def test_extract_sections(self, temp_files):
        """Test section extraction from Markdown"""
        parser = MarkdownParser()
        result = parser.parse(temp_files['markdown'])

        assert len(result.sections) > 0

        # Check section titles
        section_titles = [s.title for s in result.sections]
        assert "Overview" in section_titles
        assert "Technologies Used" in section_titles

        # Check section levels
        overview = next(s for s in result.sections if s.title == "Overview")
        assert overview.level == 2

        tech = next(s for s in result.sections if s.title == "Technologies Used")
        assert tech.level == 3

    def test_extract_images(self, temp_files):
        """Test image extraction from Markdown"""
        parser = MarkdownParser()
        result = parser.parse(temp_files['markdown'])

        assert len(result.images) == 1
        assert result.images[0].path == "./screenshot.png"
        assert result.images[0].alt_text == "Screenshot"
        assert result.images[0].caption == "Project screenshot"

    def test_generate_slug(self):
        """Test slug generation"""
        parser = MarkdownParser()

        assert parser.generate_slug("Hello World") == "hello-world"
        assert parser.generate_slug("Test 123 Project!") == "test-123-project"
        assert parser.generate_slug("  Spaces  Everywhere  ") == "spaces-everywhere"


class TestPlainTextParser:
    """Test plain text parsing functionality"""

    def test_can_parse(self):
        """Test file type detection"""
        parser = PlainTextParser()

        assert parser.can_parse("test.txt") == True
        assert parser.can_parse("test.text") == True
        assert parser.can_parse("test.md") == False
        assert parser.can_parse("test.txt", "text/plain") == True

    def test_parse_text_file(self, temp_files):
        """Test parsing plain text file"""
        parser = PlainTextParser()
        result = parser.parse(temp_files['text'])

        assert result.title == "Important Document"
        assert result.description is not None
        assert "first paragraph" in result.description
        assert result.format == FileFormat.TXT

    def test_extract_sections_heuristic(self, temp_files):
        """Test heuristic section detection"""
        parser = PlainTextParser()
        result = parser.parse(temp_files['text'])

        assert len(result.sections) >= 2

        # Check if sections were detected
        section_titles = [s.title for s in result.sections]
        assert "SECTION ONE" in section_titles
        assert "SECTION TWO" in section_titles

    def test_extract_metadata(self, temp_files):
        """Test metadata extraction from content"""
        parser = PlainTextParser()
        result = parser.parse(temp_files['text'])

        # Check extracted metadata
        assert 'emails' in result.metadata
        assert 'test@example.com' in result.metadata['emails']

        assert 'urls' in result.metadata
        assert 'https://example.com' in result.metadata['urls']

        assert 'extracted_date' in result.metadata


class TestContentParserFactory:
    """Test parser factory functionality"""

    def test_get_parser_by_extension(self):
        """Test getting parser by file extension"""
        factory = ContentParserFactory()

        assert isinstance(factory.get_parser("test.md"), MarkdownParser)
        assert isinstance(factory.get_parser("test.txt"), PlainTextParser)
        assert isinstance(factory.get_parser("test.jpg"), ImageMetadataParser)

    def test_parse_file(self, temp_files):
        """Test parsing file with auto-detection"""
        factory = ContentParserFactory()

        # Parse Markdown
        md_result = factory.parse_file(temp_files['markdown'])
        assert md_result.format == FileFormat.MARKDOWN
        assert md_result.title == "Test Project"

        # Parse text
        txt_result = factory.parse_file(temp_files['text'])
        assert txt_result.format == FileFormat.TXT
        assert txt_result.title == "Important Document"


# Content Structuring Skill Tests

class TestContentStructuringSkill:
    """Test main content structuring skill"""

    @pytest.fixture
    def skill(self):
        """Create skill instance with mocked API client"""
        with patch('skills.content_structuring.skill.AsyncAnthropic'):
            skill = ContentStructuringSkill(api_key="test-key")
            # Mock the AI client methods
            skill.client.messages = AsyncMock()
            skill.client.messages.create = AsyncMock()
            return skill

    @pytest.mark.asyncio
    async def test_process_content_basic(self, skill, sample_schema, temp_files):
        """Test basic content processing"""
        # Mock AI response
        skill.client.messages.create.return_value = Mock(
            content=[Mock(text=json.dumps({
                "entity_type": "project",
                "field_mappings": {
                    "title": "Test Project",
                    "description": "A test project",
                    "content": "Project content here",
                    "tags": ["web", "design"]
                },
                "suggested_slug": "test-project",
                "confidence_score": 0.95
            }))]
        )

        # Create input
        input_data = ContentStructuringInput(
            content_schema=sample_schema,
            uploaded_files=[
                UploadedFile(
                    file_path=temp_files['markdown'],
                    original_name="test.md",
                    mime_type="text/markdown"
                )
            ],
            processing_options=ProcessingOptions(
                auto_generate_slugs=True,
                use_ai_enhancement=True
            )
        )

        # Process content
        result = await skill.process_content(input_data)

        assert isinstance(result, StructuredContentCollection)
        assert result.schema == sample_schema
        assert len(result.content) > 0
        assert "project" in result.content
        assert len(result.content["project"]) > 0

        # Check processed item
        item = result.content["project"][0]
        assert item.entity_type == "project"
        assert item.fields["title"] == "Test Project"
        assert item.metadata.slug == "test-project"

    @pytest.mark.asyncio
    async def test_process_without_ai(self, skill, sample_schema, temp_files):
        """Test processing without AI enhancement (heuristic mode)"""
        input_data = ContentStructuringInput(
            content_schema=sample_schema,
            uploaded_files=[
                UploadedFile(
                    file_path=temp_files['markdown'],
                    original_name="test.md"
                )
            ],
            processing_options=ProcessingOptions(
                use_ai_enhancement=False,
                auto_generate_slugs=True
            )
        )

        # Process content
        result = await skill.process_content(input_data)

        assert isinstance(result, StructuredContentCollection)
        assert len(result.content) > 0

        # Check that items were created
        all_items = []
        for entity_items in result.content.values():
            all_items.extend(entity_items)

        assert len(all_items) > 0
        assert all_items[0].metadata.slug is not None

    @pytest.mark.asyncio
    async def test_process_multiple_files(self, skill, sample_schema, temp_files):
        """Test processing multiple files"""
        # Mock AI responses
        skill.client.messages.create.return_value = Mock(
            content=[Mock(text=json.dumps({
                "entity_type": "project",
                "field_mappings": {"title": "Test", "content": "Content"},
                "suggested_slug": "test",
                "confidence_score": 0.9
            }))]
        )

        input_data = ContentStructuringInput(
            content_schema=sample_schema,
            uploaded_files=[
                UploadedFile(
                    file_path=temp_files['markdown'],
                    original_name="test.md"
                ),
                UploadedFile(
                    file_path=temp_files['text'],
                    original_name="content.txt"
                )
            ]
        )

        result = await skill.process_content(input_data)

        # Check stats
        assert result.metadata.processing_stats.total_files == 2
        assert result.metadata.processing_stats.processed_files <= 2

    @pytest.mark.asyncio
    async def test_extract_relationships(self, skill, sample_schema):
        """Test relationship extraction between items"""
        # Create test items
        items = [
            ContentItem(
                id="item1",
                entity_type="project",
                fields={"title": "Web App", "description": "A web application"},
                metadata=Mock()
            ),
            ContentItem(
                id="item2",
                entity_type="blog_post",
                fields={"title": "Building the Web App", "content": "About the web app project"},
                metadata=Mock()
            )
        ]

        # Mock AI response for relationships
        skill.client.messages.create.return_value = Mock(
            content=[Mock(text=json.dumps([
                {
                    "source_item_id": "item2",
                    "target_item_id": "item1",
                    "relationship_id": "references",
                    "confidence": 0.85,
                    "reason": "Blog post references the project"
                }
            ]))]
        )

        relationships = await skill._extract_relationships(items, sample_schema)

        assert len(relationships) == 1
        assert relationships[0]["source_item_id"] == "item2"
        assert relationships[0]["target_item_id"] == "item1"

    def test_generate_slug(self, skill):
        """Test slug generation"""
        assert skill._generate_slug("Hello World!") == "hello-world"
        assert skill._generate_slug("Test 123 & More") == "test-123-more"
        assert skill._generate_slug("  Multiple   Spaces  ") == "multiple-spaces"

    def test_chunk_content(self, skill):
        """Test content chunking for large files"""
        content = ExtractedContent(
            raw_text="Paragraph 1\n\nParagraph 2\n\nParagraph 3",
            format=FileFormat.TXT
        )

        chunks = skill._chunk_content(content, max_size=20)

        assert len(chunks) > 1
        assert all(len(chunk) <= 30 for chunk in chunks)  # Some tolerance

    @pytest.mark.asyncio
    async def test_validate_schema(self, skill, sample_schema):
        """Test schema validation"""
        issues = await skill.validate_schema(sample_schema)
        assert len(issues) == 0  # Valid schema should have no issues

        # Test invalid schema
        invalid_schema = ContentSchema(
            version="1.0.0",
            entities=[],  # No entities
            relationships=[],
            metadata=sample_schema.metadata
        )

        issues = await skill.validate_schema(invalid_schema)
        assert len(issues) > 0
        assert "at least one entity" in issues[0].lower()

    def test_extract_field_value(self, skill):
        """Test field value extraction from content"""
        content = ExtractedContent(
            title="Test Title",
            description="Test Description",
            author="John Doe",
            tags=["tag1", "tag2"],
            date=datetime.now(),
            format=FileFormat.MARKDOWN
        )

        # Test direct mappings
        assert skill._extract_field_value("title", GenericFieldType.TEXT, content) == "Test Title"
        assert skill._extract_field_value("description", GenericFieldType.TEXT, content) == "Test Description"
        assert skill._extract_field_value("author", GenericFieldType.TEXT, content) == "John Doe"
        assert skill._extract_field_value("tags", GenericFieldType.TAGS, content) == ["tag1", "tag2"]
        assert skill._extract_field_value("date", GenericFieldType.DATE, content) is not None

    def test_guess_entity_type(self, skill, sample_schema):
        """Test entity type guessing"""
        # Content mentioning "project"
        content = ExtractedContent(
            raw_text="This is a project about web development",
            format=FileFormat.TXT
        )
        entity = skill._guess_entity_type(content, sample_schema)
        assert entity == "project"

        # Content mentioning "blog post"
        content = ExtractedContent(
            raw_text="This blog post discusses recent trends",
            format=FileFormat.TXT
        )
        entity = skill._guess_entity_type(content, sample_schema)
        assert entity == "blog_post"


# Integration Tests

class TestIntegration:
    """Integration tests for the complete workflow"""

    @pytest.mark.asyncio
    async def test_end_to_end_processing(self, sample_schema, temp_files):
        """Test complete end-to-end processing"""
        with patch('skills.content_structuring.skill.AsyncAnthropic'):
            skill = ContentStructuringSkill(api_key="test-key")

            # Mock AI response
            skill.client.messages = AsyncMock()
            skill.client.messages.create = AsyncMock(return_value=Mock(
                content=[Mock(text=json.dumps({
                    "entity_type": "project",
                    "field_mappings": {
                        "title": "Test Project",
                        "description": "Description",
                        "content": "Full content",
                        "tags": ["web", "design"]
                    },
                    "suggested_slug": "test-project",
                    "confidence_score": 0.9
                }))]
            ))

            # Process content
            input_data = ContentStructuringInput(
                content_schema=sample_schema,
                uploaded_files=[
                    UploadedFile(
                        file_path=temp_files['markdown'],
                        original_name="test.md"
                    )
                ],
                processing_options=ProcessingOptions(
                    auto_generate_slugs=True,
                    extract_relationships=True,
                    use_ai_enhancement=True
                )
            )

            result = await skill.process_content(input_data)

            # Verify complete result
            assert isinstance(result, StructuredContentCollection)
            assert result.metadata.generator == "content_structuring_skill"
            assert result.metadata.processing_stats.total_files == 1
            assert result.metadata.processing_stats.processed_files == 1
            assert result.metadata.processing_stats.failed_files == 0

            # Verify content
            assert "project" in result.content
            items = result.content["project"]
            assert len(items) > 0

            item = items[0]
            assert item.entity_type == "project"
            assert item.fields["title"] == "Test Project"
            assert item.metadata.slug == "test-project"
            assert item.metadata.status == ContentStatus.DRAFT
            assert item.metadata.source.type == ContentSourceType.UPLOAD

    @pytest.mark.asyncio
    async def test_error_handling(self, sample_schema):
        """Test error handling and recovery"""
        skill = ContentStructuringSkill(api_key="test-key")

        # Test with non-existent file
        input_data = ContentStructuringInput(
            content_schema=sample_schema,
            uploaded_files=[
                UploadedFile(
                    file_path="/non/existent/file.txt",
                    original_name="missing.txt"
                )
            ],
            processing_options=ProcessingOptions(
                ignore_errors=True
            )
        )

        result = await skill.process_content(input_data)

        # Should handle error gracefully
        assert result.metadata.processing_stats.failed_files == 1
        assert len(result.metadata.processing_stats.errors) > 0


# Performance Tests

class TestPerformance:
    """Test performance characteristics"""

    @pytest.mark.asyncio
    async def test_large_file_processing(self, sample_schema):
        """Test processing of large content"""
        # Create large content
        large_text = "Large content. " * 1000  # ~14KB

        with tempfile.NamedTemporaryFile(mode='w', suffix='.txt', delete=False) as f:
            f.write(large_text)
            temp_path = f.name

        try:
            with patch('skills.content_structuring.skill.AsyncAnthropic'):
                skill = ContentStructuringSkill(api_key="test-key")
                skill.client.messages = AsyncMock()
                skill.client.messages.create = AsyncMock(return_value=Mock(
                    content=[Mock(text='{"entity_type": "project", "field_mappings": {}}')]
                ))

                input_data = ContentStructuringInput(
                    content_schema=sample_schema,
                    uploaded_files=[
                        UploadedFile(
                            file_path=temp_path,
                            original_name="large.txt"
                        )
                    ],
                    processing_options=ProcessingOptions(
                        chunk_large_files=True,
                        max_chunk_size=1000
                    )
                )

                result = await skill.process_content(input_data)

                # Should process successfully
                assert result.metadata.processing_stats.processed_files == 1

        finally:
            os.unlink(temp_path)


if __name__ == "__main__":
    pytest.main([__file__, "-v"])