"""
Pydantic models for Domain Mapping Skill
Defines input/output models for the conversational portfolio structure discovery
"""

from typing import Dict, List, Optional, Any, Literal, Union
from datetime import datetime
from pydantic import BaseModel, Field
from enum import Enum


# Enums matching TypeScript types
class GenericFieldType(str, Enum):
    # Text types
    TEXT = "text"
    TEXTAREA = "textarea"
    RICHTEXT = "richtext"
    MARKDOWN = "markdown"
    CODE = "code"

    # Number types
    NUMBER = "number"
    RANGE = "range"

    # Choice types
    BOOLEAN = "boolean"
    SELECT = "select"
    MULTISELECT = "multiselect"
    RADIO = "radio"
    CHECKBOX = "checkbox"

    # Date/Time types
    DATE = "date"
    TIME = "time"
    DATETIME = "datetime"

    # Media types
    IMAGE = "image"
    FILE = "file"
    GALLERY = "gallery"
    FILES = "files"

    # Structured types
    JSON = "json"
    LIST = "list"
    STRUCTURE = "structure"
    BLOCKS = "blocks"

    # Relational types
    RELATION = "relation"
    RELATIONS = "relations"

    # Special types
    URL = "url"
    EMAIL = "email"
    TEL = "tel"
    COLOR = "color"
    LOCATION = "location"
    TAGS = "tags"


class RelationshipType(str, Enum):
    ONE_TO_ONE = "one-to-one"
    ONE_TO_MANY = "one-to-many"
    MANY_TO_MANY = "many-to-many"


class ConversationState(str, Enum):
    INITIAL = "initial"
    DISCOVERING_PROFESSION = "discovering_profession"
    DISCOVERING_ENTITIES = "discovering_entities"
    DISCOVERING_FIELDS = "discovering_fields"
    DISCOVERING_RELATIONSHIPS = "discovering_relationships"
    VALIDATING = "validating"
    COMPLETE = "complete"


# Input Models
class DomainMappingInput(BaseModel):
    """Input for the domain mapping conversation"""
    user_message: str = Field(description="The user's message or response")
    session_id: str = Field(description="Unique session identifier for conversation continuity")
    context: Optional[Dict[str, Any]] = Field(default=None, description="Additional context about the user")
    profession: Optional[str] = Field(default=None, description="User's profession if already known")
    initial_data: Optional[Dict[str, Any]] = Field(default=None, description="Any initial portfolio data")


class ConversationContext(BaseModel):
    """Maintains conversation state and discovered information"""
    session_id: str
    state: ConversationState = ConversationState.INITIAL
    profession: Optional[str] = None
    portfolio_type: Optional[str] = None
    discovered_entities: List["EntitySchema"] = []
    discovered_relationships: List["RelationshipSchema"] = []
    conversation_history: List[Dict[str, str]] = []
    needs_clarification: List[str] = []
    suggestions_made: List[str] = []


# Schema Models (Python equivalent of TypeScript types)
class FieldChoice(BaseModel):
    value: Union[str, int]
    label: str
    disabled: Optional[bool] = False


class FieldOptions(BaseModel):
    # Text options
    min_length: Optional[int] = Field(default=None, alias="minLength")
    max_length: Optional[int] = Field(default=None, alias="maxLength")
    pattern: Optional[str] = None

    # Number options
    min: Optional[float] = None
    max: Optional[float] = None
    step: Optional[float] = None

    # Choice options
    choices: Optional[List[FieldChoice]] = None
    allow_custom: Optional[bool] = Field(default=None, alias="allowCustom")

    # Media options
    accept: Optional[List[str]] = None
    max_size: Optional[int] = Field(default=None, alias="maxSize")
    max_files: Optional[int] = Field(default=None, alias="maxFiles")

    # Structure options
    fields: Optional[List["FieldSchema"]] = None
    max_items: Optional[int] = Field(default=None, alias="maxItems")

    # Relation options
    target_entity: Optional[str] = Field(default=None, alias="targetEntity")
    multiple: Optional[bool] = None

    # Rich text options
    allowed_blocks: Optional[List[str]] = Field(default=None, alias="allowedBlocks")
    allowed_formats: Optional[List[str]] = Field(default=None, alias="allowedFormats")

    # Generic options
    default_value: Optional[Any] = Field(default=None, alias="defaultValue")
    readonly: Optional[bool] = None

    class Config:
        populate_by_name = True


class ValidationRule(BaseModel):
    type: str
    message: str
    params: Optional[Dict[str, Any]] = None


class FieldValidationRules(BaseModel):
    required: Optional[bool] = None
    unique: Optional[bool] = None
    min: Optional[float] = None
    max: Optional[float] = None
    pattern: Optional[str] = None
    custom: Optional[List[ValidationRule]] = None


class FieldSchema(BaseModel):
    id: str
    name: str
    label: str
    type: GenericFieldType
    required: bool = False

    # Configuration
    options: Optional[FieldOptions] = None
    validation: Optional[FieldValidationRules] = None

    # Display hints
    help_text: Optional[str] = Field(default=None, alias="helpText")
    placeholder: Optional[str] = None
    width: Optional[Literal["full", "half", "third", "quarter"]] = None

    class Config:
        populate_by_name = True


class EntitySchema(BaseModel):
    id: str
    name: str
    plural_name: str = Field(alias="pluralName")
    description: Optional[str] = None
    fields: List[FieldSchema] = []

    # Display hints
    display_field: Optional[str] = Field(default=None, alias="displayField")
    icon: Optional[str] = None
    color: Optional[str] = None

    # Behavior hints
    sortable: Optional[bool] = None
    timestamps: Optional[bool] = None
    slug_source: Optional[str] = Field(default=None, alias="slugSource")

    class Config:
        populate_by_name = True


class RelationshipSchema(BaseModel):
    id: str
    type: RelationshipType
    from_entity: str = Field(alias="from")
    to_entity: str = Field(alias="to")
    label: str
    invers_label: Optional[str] = Field(default=None, alias="inversLabel")

    # Behavior
    required: Optional[bool] = None
    cascade_delete: Optional[bool] = Field(default=None, alias="cascadeDelete")

    class Config:
        populate_by_name = True


class SchemaMetadata(BaseModel):
    name: str
    description: Optional[str] = None
    author: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.now, alias="createdAt")
    updated_at: datetime = Field(default_factory=datetime.now, alias="updatedAt")

    class Config:
        populate_by_name = True


class ContentSchema(BaseModel):
    """The main content schema - Python equivalent of TypeScript ContentSchema"""
    version: str = "1.0.0"
    entities: List[EntitySchema] = []
    relationships: List[RelationshipSchema] = []
    metadata: SchemaMetadata

    class Config:
        populate_by_name = True


# Output Models
class DomainMappingResponse(BaseModel):
    """Response from the domain mapping conversation"""
    message: str = Field(description="The AI's response message")
    suggested_questions: List[str] = Field(default=[], description="Suggested follow-up questions")
    current_state: ConversationState
    content_schema: Optional[ContentSchema] = Field(default=None, description="The generated schema (when complete)", alias="schema")
    needs_input_on: Optional[List[str]] = Field(default=None, description="Areas needing user clarification")
    examples: Optional[List[Dict[str, Any]]] = Field(default=None, description="Example data for entities")


class StreamingResponse(BaseModel):
    """Model for streaming responses"""
    type: Literal["message", "suggestion", "schema_update", "state_change", "complete"]
    content: Optional[str] = None
    data: Optional[Dict[str, Any]] = None
    timestamp: datetime = Field(default_factory=datetime.now)


# Professional Templates (for common portfolio patterns)
class ProfessionTemplate(BaseModel):
    """Template for common portfolio structures by profession"""
    profession: str
    portfolio_type: str
    common_entities: List[Dict[str, Any]]
    common_relationships: List[Dict[str, Any]]
    suggested_fields: Dict[str, List[Dict[str, Any]]]


# Update forward references
FieldOptions.model_rebuild()
FieldSchema.model_rebuild()