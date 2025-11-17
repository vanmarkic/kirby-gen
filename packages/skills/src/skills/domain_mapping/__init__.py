"""
Domain Mapping Skill - Conversational Portfolio Structure Discovery
"""

from .skill import DomainMappingSkill
from .models import (
    DomainMappingInput,
    DomainMappingResponse,
    ConversationContext,
    ConversationState,
    ContentSchema,
    EntitySchema,
    RelationshipSchema,
    FieldSchema,
    SchemaMetadata,
    StreamingResponse,
    GenericFieldType,
    RelationshipType,
    ProfessionTemplate
)
from .prompts import (
    get_profession_templates,
    get_relationship_suggestions,
    format_entity_summary,
    format_relationship_summary
)

__all__ = [
    # Main skill class
    "DomainMappingSkill",

    # Input/Output models
    "DomainMappingInput",
    "DomainMappingResponse",
    "StreamingResponse",

    # Schema models
    "ContentSchema",
    "EntitySchema",
    "RelationshipSchema",
    "FieldSchema",
    "SchemaMetadata",

    # Context and state
    "ConversationContext",
    "ConversationState",

    # Enums
    "GenericFieldType",
    "RelationshipType",

    # Templates
    "ProfessionTemplate",

    # Helper functions
    "get_profession_templates",
    "get_relationship_suggestions",
    "format_entity_summary",
    "format_relationship_summary"
]

# Version
__version__ = "1.0.0"