"""
Unit tests for Domain Mapping Skill
Tests conversation flow, schema generation, and edge cases
"""

import pytest
import asyncio
import json
from unittest.mock import Mock, AsyncMock, patch, MagicMock
from datetime import datetime
from typing import List, Dict, Any

import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../../../src')))

from skills.domain_mapping import (
    DomainMappingSkill,
    DomainMappingInput,
    DomainMappingResponse,
    ConversationContext,
    ConversationState,
    ContentSchema,
    EntitySchema,
    FieldSchema,
    RelationshipSchema,
    GenericFieldType,
    RelationshipType,
    StreamingResponse
)
from skills.domain_mapping.prompts import (
    get_profession_templates,
    get_relationship_suggestions
)


@pytest.fixture
def mock_api_key():
    """Provide mock API key"""
    return "test-api-key-123"


@pytest.fixture
def domain_mapping_skill(mock_api_key):
    """Create DomainMappingSkill instance with mocked Anthropic client"""
    with patch('skills.domain_mapping.skill.AsyncAnthropic'):
        with patch('skills.domain_mapping.skill.Anthropic'):
            skill = DomainMappingSkill(api_key=mock_api_key)
            return skill


@pytest.fixture
def sample_input():
    """Sample input for testing"""
    return DomainMappingInput(
        user_message="I'm a photographer and want to build my portfolio",
        session_id="test-session-123",
        context={"location": "New York"},
        profession="photographer"
    )


@pytest.fixture
def sample_context():
    """Sample conversation context"""
    return ConversationContext(
        session_id="test-session-123",
        state=ConversationState.DISCOVERING_ENTITIES,
        profession="photographer",
        portfolio_type="Photography Portfolio",
        discovered_entities=[
            EntitySchema(
                id="photo",
                name="Photo",
                plural_name="Photos",
                description="Individual photographs",
                fields=[]
            )
        ],
        discovered_relationships=[],
        conversation_history=[
            {"role": "user", "content": "I'm a photographer"},
            {"role": "assistant", "content": '{"message": "Great! Let\'s build your photography portfolio"}'}
        ]
    )


class TestDomainMappingSkill:
    """Test the main DomainMappingSkill class"""

    def test_initialization(self, mock_api_key):
        """Test skill initialization"""
        with patch('skills.domain_mapping.skill.AsyncAnthropic') as mock_async:
            with patch('skills.domain_mapping.skill.Anthropic') as mock_sync:
                skill = DomainMappingSkill(api_key=mock_api_key)

                assert skill is not None
                assert len(skill.conversations) == 0
                assert skill.profession_templates is not None
                mock_async.assert_called_once_with(api_key=mock_api_key)
                mock_sync.assert_called_once_with(api_key=mock_api_key)

    def test_get_or_create_context(self, domain_mapping_skill):
        """Test context creation and retrieval"""
        session_id = "test-session-456"

        # Create new context
        context = domain_mapping_skill._get_or_create_context(session_id)
        assert context.session_id == session_id
        assert context.state == ConversationState.INITIAL

        # Retrieve existing context
        context2 = domain_mapping_skill._get_or_create_context(session_id)
        assert context2 == context

    def test_determine_next_state_progression(self, domain_mapping_skill, sample_context):
        """Test state progression logic"""
        # Initial -> Discovering Profession
        context = ConversationContext(
            session_id="test",
            state=ConversationState.INITIAL
        )
        updated = domain_mapping_skill._determine_next_state(context, "Hello")
        assert updated.state == ConversationState.DISCOVERING_PROFESSION

        # Discovering Profession -> Discovering Entities (when profession is set)
        context.state = ConversationState.DISCOVERING_PROFESSION
        context.profession = "designer"
        updated = domain_mapping_skill._determine_next_state(context, "I'm a designer")
        assert updated.state == ConversationState.DISCOVERING_ENTITIES

        # Discovering Entities -> Discovering Fields
        sample_context.state = ConversationState.DISCOVERING_ENTITIES
        updated = domain_mapping_skill._determine_next_state(sample_context, "That's enough entities, let's continue")
        assert updated.state == ConversationState.DISCOVERING_FIELDS

    def test_parse_claude_response(self, domain_mapping_skill):
        """Test Claude response parsing"""
        # Valid JSON response
        json_response = '{"message": "Hello", "suggested_questions": ["Q1", "Q2"]}'
        parsed = domain_mapping_skill._parse_claude_response(json_response)
        assert parsed["message"] == "Hello"
        assert len(parsed["suggested_questions"]) == 2

        # JSON in markdown code block
        markdown_response = '```json\n{"message": "Test"}\n```'
        parsed = domain_mapping_skill._parse_claude_response(markdown_response)
        assert parsed["message"] == "Test"

        # Invalid JSON (fallback to text)
        text_response = "This is plain text"
        parsed = domain_mapping_skill._parse_claude_response(text_response)
        assert parsed["message"] == text_response

    def test_update_context_from_response(self, domain_mapping_skill, sample_context):
        """Test context updates from Claude response"""
        response_data = {
            "message": "Let's add some fields",
            "profession": "photographer",
            "portfolio_type": "Photography Portfolio",
            "entities": [
                {
                    "id": "gallery",
                    "name": "Gallery",
                    "pluralName": "Galleries",
                    "description": "Photo collections",
                    "fields": []
                }
            ],
            "needs_input_on": ["gallery structure"]
        }

        updated = domain_mapping_skill._update_context_from_response(sample_context, response_data)

        assert updated.profession == "photographer"
        assert updated.portfolio_type == "Photography Portfolio"
        assert len(updated.discovered_entities) == 2  # Original + new
        assert updated.needs_clarification == ["gallery structure"]
        assert len(updated.conversation_history) == 3  # Added assistant message

    def test_build_content_schema(self, domain_mapping_skill):
        """Test ContentSchema building"""
        context = ConversationContext(
            session_id="test",
            state=ConversationState.COMPLETE,
            profession="writer",
            portfolio_type="Writing Portfolio",
            discovered_entities=[
                EntitySchema(
                    id="article",
                    name="Article",
                    plural_name="Articles",
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
                        )
                    ]
                )
            ],
            discovered_relationships=[
                RelationshipSchema(
                    id="article-category",
                    type=RelationshipType.MANY_TO_ONE,
                    from_entity="article",
                    to_entity="category",
                    label="belongs to"
                )
            ]
        )

        schema = domain_mapping_skill._build_content_schema(context)

        assert schema.version == "1.0.0"
        assert len(schema.entities) == 1
        assert schema.entities[0].name == "Article"
        assert len(schema.entities[0].fields) == 2
        assert len(schema.relationships) == 1
        assert schema.metadata.name == "writer Portfolio Schema"

    @pytest.mark.asyncio
    async def test_process_conversation_complete_flow(self, domain_mapping_skill, sample_input):
        """Test complete conversation response"""
        # Mock the Anthropic client response
        mock_response = MagicMock()
        mock_response.content = [MagicMock(text=json.dumps({
            "message": "I understand you're a photographer. Let's explore what you want to showcase.",
            "suggested_questions": [
                "What type of photography do you specialize in?",
                "Do you want to organize photos by project or category?"
            ],
            "current_state": "discovering_entities",
            "profession": "photographer",
            "portfolio_type": "Photography Portfolio"
        }))]

        domain_mapping_skill.client.messages.create = AsyncMock(return_value=mock_response)

        # Process conversation
        response = await domain_mapping_skill.process_conversation(sample_input, stream=False)

        assert isinstance(response, DomainMappingResponse)
        assert "photographer" in response.message.lower()
        assert len(response.suggested_questions) > 0
        assert response.current_state == ConversationState.DISCOVERING_PROFESSION

    @pytest.mark.asyncio
    async def test_streaming_response(self, domain_mapping_skill, sample_input):
        """Test streaming response generation"""
        # Mock streaming events
        mock_events = [
            MagicMock(type="content_block_delta", delta=MagicMock(text="I understand ")),
            MagicMock(type="content_block_delta", delta=MagicMock(text="you're a photographer.")),
        ]

        async def mock_stream():
            for event in mock_events:
                yield event

        mock_stream_obj = AsyncMock()
        mock_stream_obj.__aiter__ = mock_stream

        domain_mapping_skill.client.messages.create = AsyncMock(return_value=mock_stream_obj)

        # Process streaming conversation
        stream_gen = domain_mapping_skill.process_conversation(sample_input, stream=True)

        responses = []
        async for response in stream_gen:
            responses.append(response)

        # Should have message chunks and completion
        message_responses = [r for r in responses if r.type == "message"]
        assert len(message_responses) > 0

        # Check for completion signal
        complete_responses = [r for r in responses if r.type == "complete"]
        assert len(complete_responses) == 1

    def test_conversation_history(self, domain_mapping_skill, sample_context):
        """Test conversation history retrieval"""
        # Add context to conversations
        domain_mapping_skill.conversations[sample_context.session_id] = sample_context

        # Get history
        history = domain_mapping_skill.get_conversation_history(sample_context.session_id)
        assert len(history) == 2
        assert history[0]["role"] == "user"

        # Non-existent session
        empty_history = domain_mapping_skill.get_conversation_history("non-existent")
        assert len(empty_history) == 0

    def test_reset_conversation(self, domain_mapping_skill, sample_context):
        """Test conversation reset"""
        # Add context
        domain_mapping_skill.conversations[sample_context.session_id] = sample_context
        assert len(domain_mapping_skill.conversations) == 1

        # Reset
        domain_mapping_skill.reset_conversation(sample_context.session_id)
        assert sample_context.session_id not in domain_mapping_skill.conversations

    @pytest.mark.asyncio
    async def test_suggest_improvements(self, domain_mapping_skill):
        """Test schema improvement suggestions"""
        schema = ContentSchema(
            version="1.0.0",
            entities=[
                EntitySchema(
                    id="project",
                    name="Project",
                    plural_name="Projects",
                    fields=[
                        FieldSchema(
                            id="title",
                            name="title",
                            label="Title",
                            type=GenericFieldType.TEXT,
                            required=True
                        )
                    ]
                )
            ],
            relationships=[],
            metadata=SchemaMetadata(name="Test Schema")
        )

        mock_response = MagicMock()
        mock_response.content = [MagicMock(text=json.dumps([
            "Add a description field to projects",
            "Include project categories for better organization",
            "Add SEO metadata fields"
        ]))]

        domain_mapping_skill.client.messages.create = AsyncMock(return_value=mock_response)

        suggestions = await domain_mapping_skill.suggest_improvements(schema)

        assert isinstance(suggestions, list)
        assert len(suggestions) == 3
        assert "description" in suggestions[0].lower()


class TestPromptGeneration:
    """Test prompt generation for different states"""

    def test_generate_prompt_for_profession_discovery(self, domain_mapping_skill):
        """Test profession discovery prompt generation"""
        context = ConversationContext(
            session_id="test",
            state=ConversationState.DISCOVERING_PROFESSION
        )

        prompt = domain_mapping_skill._generate_prompt_for_state(context, "I build websites")

        assert "profession" in prompt.lower()
        assert "portfolio" in prompt.lower()
        assert "I build websites" in prompt

    def test_generate_prompt_for_entity_discovery(self, domain_mapping_skill):
        """Test entity discovery prompt generation"""
        context = ConversationContext(
            session_id="test",
            state=ConversationState.DISCOVERING_ENTITIES,
            profession="developer",
            portfolio_type="Developer Portfolio"
        )

        prompt = domain_mapping_skill._generate_prompt_for_state(context, "I need projects and skills")

        assert "developer" in prompt.lower()
        assert "entities" in prompt.lower()
        assert "I need projects and skills" in prompt

    def test_generate_prompt_for_field_discovery(self, domain_mapping_skill, sample_context):
        """Test field discovery prompt generation"""
        sample_context.state = ConversationState.DISCOVERING_FIELDS

        prompt = domain_mapping_skill._generate_prompt_for_state(
            sample_context,
            "Add title, description, and image"
        )

        assert "Photo" in prompt  # Entity name
        assert "fields" in prompt.lower()

    def test_generate_prompt_for_relationship_discovery(self, domain_mapping_skill, sample_context):
        """Test relationship discovery prompt generation"""
        sample_context.state = ConversationState.DISCOVERING_RELATIONSHIPS
        sample_context.discovered_entities.append(
            EntitySchema(
                id="gallery",
                name="Gallery",
                plural_name="Galleries",
                fields=[]
            )
        )

        prompt = domain_mapping_skill._generate_prompt_for_state(
            sample_context,
            "Photos should belong to galleries"
        )

        assert "Photo" in prompt
        assert "Gallery" in prompt
        assert "relationship" in prompt.lower()


class TestProfessionTemplates:
    """Test profession templates and suggestions"""

    def test_get_profession_templates(self):
        """Test retrieving profession templates"""
        templates = get_profession_templates()

        assert "writer" in templates
        assert "designer" in templates
        assert "photographer" in templates
        assert "developer" in templates
        assert "artist" in templates

        # Check writer template structure
        writer_template = templates["writer"]
        assert writer_template["portfolio_type"] == "Writing Portfolio"
        assert len(writer_template["entities"]) > 0
        assert "Book" in [e["name"] for e in writer_template["entities"]]

    def test_get_relationship_suggestions(self):
        """Test relationship suggestions based on entities"""
        # Test with project and client entities
        entities = ["Project", "Client", "Category"]
        suggestions = get_relationship_suggestions(entities)

        # Should suggest project-client relationship
        project_client_rel = next(
            (s for s in suggestions if s["from"] == "Project" and s["to"] == "Client"),
            None
        )
        assert project_client_rel is not None
        assert project_client_rel["type"] == "many-to-one"

        # Should suggest project-category relationship
        project_category_rel = next(
            (s for s in suggestions if s["from"] == "Project" and s["to"] == "Category"),
            None
        )
        assert project_category_rel is not None
        assert project_category_rel["type"] == "many-to-many"


class TestEdgeCases:
    """Test edge cases and error handling"""

    def test_ambiguous_profession_handling(self, domain_mapping_skill):
        """Test handling of ambiguous professions"""
        context = ConversationContext(
            session_id="test",
            state=ConversationState.DISCOVERING_PROFESSION,
            profession="creative"  # Ambiguous term
        )

        # Should still generate a valid prompt
        prompt = domain_mapping_skill._generate_prompt_for_state(
            context,
            "I do various creative work"
        )
        assert prompt is not None
        assert len(prompt) > 0

    def test_complex_relationships(self, domain_mapping_skill):
        """Test handling of complex many-to-many relationships"""
        context = ConversationContext(
            session_id="test",
            state=ConversationState.DISCOVERING_RELATIONSHIPS,
            discovered_entities=[
                EntitySchema(id="project", name="Project", plural_name="Projects", fields=[]),
                EntitySchema(id="skill", name="Skill", plural_name="Skills", fields=[]),
                EntitySchema(id="team_member", name="TeamMember", plural_name="TeamMembers", fields=[])
            ]
        )

        # Should handle multiple relationship types
        prompt = domain_mapping_skill._generate_prompt_for_state(
            context,
            "Projects use multiple skills and have multiple team members"
        )
        assert "Project" in prompt
        assert "Skill" in prompt
        assert "TeamMember" in prompt

    @pytest.mark.asyncio
    async def test_error_handling_in_streaming(self, domain_mapping_skill, sample_input):
        """Test error handling during streaming"""
        # Mock an error during streaming
        domain_mapping_skill.client.messages.create = AsyncMock(
            side_effect=Exception("API Error")
        )

        stream_gen = domain_mapping_skill.process_conversation(sample_input, stream=True)

        responses = []
        async for response in stream_gen:
            responses.append(response)

        # Should have error message
        error_responses = [r for r in responses if "error" in r.content.lower()]
        assert len(error_responses) > 0

    def test_empty_entities_list(self, domain_mapping_skill):
        """Test handling when no entities are defined"""
        context = ConversationContext(
            session_id="test",
            state=ConversationState.DISCOVERING_FIELDS,
            discovered_entities=[]  # Empty list
        )

        # Should handle gracefully
        prompt = domain_mapping_skill._generate_prompt_for_state(context, "Add fields")
        assert prompt is not None

    def test_invalid_field_types(self, domain_mapping_skill, sample_context):
        """Test handling of invalid field type in response"""
        response_data = {
            "entities": [
                {
                    "id": "test",
                    "name": "Test",
                    "pluralName": "Tests",
                    "fields": [
                        {
                            "id": "field1",
                            "name": "field1",
                            "label": "Field 1",
                            "type": "invalid_type",  # Invalid type
                            "required": True
                        }
                    ]
                }
            ]
        }

        # Should not crash when updating context
        try:
            updated = domain_mapping_skill._update_context_from_response(
                sample_context,
                response_data
            )
            # May or may not update based on validation
        except Exception as e:
            # Should handle gracefully
            assert isinstance(e, (ValueError, KeyError))


class TestModels:
    """Test Pydantic models"""

    def test_field_schema_creation(self):
        """Test FieldSchema model creation"""
        field = FieldSchema(
            id="title",
            name="title",
            label="Title",
            type=GenericFieldType.TEXT,
            required=True,
            help_text="Enter the title",
            placeholder="My Project"
        )

        assert field.id == "title"
        assert field.type == GenericFieldType.TEXT
        assert field.required is True

        # Test serialization with aliases
        serialized = field.model_dump(by_alias=True)
        assert "helpText" in serialized

    def test_entity_schema_creation(self):
        """Test EntitySchema model creation"""
        entity = EntitySchema(
            id="project",
            name="Project",
            plural_name="Projects",
            description="Portfolio projects",
            display_field="title",
            sortable=True,
            timestamps=True
        )

        assert entity.name == "Project"
        assert entity.plural_name == "Projects"
        assert entity.sortable is True

        # Test serialization
        serialized = entity.model_dump(by_alias=True)
        assert "pluralName" in serialized
        assert "displayField" in serialized

    def test_relationship_schema_creation(self):
        """Test RelationshipSchema model creation"""
        relationship = RelationshipSchema(
            id="project-category",
            type=RelationshipType.MANY_TO_MANY,
            from_entity="project",
            to_entity="category",
            label="belongs to",
            required=False
        )

        assert relationship.type == RelationshipType.MANY_TO_MANY
        assert relationship.from_entity == "project"
        assert relationship.to_entity == "category"

    def test_content_schema_creation(self):
        """Test complete ContentSchema creation"""
        schema = ContentSchema(
            version="1.0.0",
            entities=[
                EntitySchema(
                    id="post",
                    name="Post",
                    plural_name="Posts",
                    fields=[]
                )
            ],
            relationships=[],
            metadata=SchemaMetadata(name="Blog Schema")
        )

        assert schema.version == "1.0.0"
        assert len(schema.entities) == 1
        assert schema.metadata.name == "Blog Schema"

    def test_streaming_response_creation(self):
        """Test StreamingResponse model"""
        response = StreamingResponse(
            type="message",
            content="Hello",
            data={"key": "value"}
        )

        assert response.type == "message"
        assert response.content == "Hello"
        assert response.data["key"] == "value"
        assert response.timestamp is not None


if __name__ == "__main__":
    pytest.main([__file__, "-v"])