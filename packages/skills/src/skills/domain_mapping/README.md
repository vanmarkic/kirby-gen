# Domain Mapping Skill

A conversational AI agent powered by Claude Opus that guides users through discovering and defining their portfolio structure. This skill helps users create a comprehensive ContentSchema by engaging in a natural conversation about their profession, needs, and preferences.

## Features

- **Conversational Discovery**: Natural language interface that feels like a consultation, not a form
- **Profession-Specific Templates**: Pre-built templates for common professions (writer, designer, photographer, developer, artist)
- **Smart Suggestions**: Intelligent recommendations for entities, fields, and relationships based on profession
- **Streaming Support**: Real-time response streaming for better UX
- **Schema Validation**: Ensures generated schemas are complete and logical
- **Iterative Refinement**: Users can refine and adjust the schema through conversation

## Installation

```bash
pip install anthropic pydantic
```

## Usage

### Basic Example

```python
from skills.domain_mapping import DomainMappingSkill, DomainMappingInput

# Initialize the skill
skill = DomainMappingSkill(api_key="your-anthropic-api-key")

# Start a conversation
input_data = DomainMappingInput(
    user_message="I'm a photographer and want to build my portfolio",
    session_id="unique-session-id"
)

# Get response (non-streaming)
response = await skill.process_conversation(input_data, stream=False)
print(response.message)
print(response.suggested_questions)
```

### Streaming Example

```python
# Process with streaming for real-time updates
async for chunk in await skill.process_conversation(input_data, stream=True):
    if chunk.type == "message":
        print(chunk.content, end="", flush=True)
    elif chunk.type == "schema_update":
        print(f"Schema updated: {chunk.data}")
    elif chunk.type == "state_change":
        print(f"State: {chunk.data['state']}")
```

## Conversation Flow

The skill guides users through these states:

1. **Initial**: Starting the conversation
2. **Discovering Profession**: Understanding the user's profession and portfolio type
3. **Discovering Entities**: Identifying content types needed (e.g., Projects, Articles, Photos)
4. **Discovering Fields**: Defining fields for each entity (title, description, images, etc.)
5. **Discovering Relationships**: Establishing connections between entities
6. **Validating**: Reviewing and confirming the complete structure
7. **Complete**: Final schema generation

## Output Schema

The skill generates a `ContentSchema` that includes:

- **Entities**: Content types with their fields
- **Relationships**: Connections between entities (one-to-one, one-to-many, many-to-many)
- **Metadata**: Schema information including version, name, and timestamps

Example output structure:
```json
{
  "version": "1.0.0",
  "entities": [
    {
      "id": "photo",
      "name": "Photo",
      "pluralName": "Photos",
      "fields": [
        {
          "id": "title",
          "name": "title",
          "label": "Title",
          "type": "text",
          "required": true
        }
      ]
    }
  ],
  "relationships": [
    {
      "id": "photo-gallery",
      "type": "many-to-many",
      "from": "photo",
      "to": "gallery",
      "label": "included in"
    }
  ],
  "metadata": {
    "name": "Photography Portfolio Schema",
    "createdAt": "2024-01-01T00:00:00Z"
  }
}
```

## Profession Templates

Built-in templates for common professions:

- **Writer**: Books, Articles, Publications, Events, Awards
- **Designer**: Projects, Clients, Services, Testimonials, Tools
- **Photographer**: Galleries, Photos, Exhibitions, Clients, Categories
- **Developer**: Projects, Skills, Experience, BlogPosts, Certifications
- **Artist**: Artworks, Collections, Exhibitions, Commissions, Mediums

## API Reference

### DomainMappingSkill

#### Methods

- `process_conversation(input_data, stream=True)`: Process a conversation turn
- `get_conversation_history(session_id)`: Retrieve conversation history
- `reset_conversation(session_id)`: Reset a conversation session
- `suggest_improvements(schema)`: Get improvement suggestions for existing schema

### Models

- `DomainMappingInput`: User input model
- `DomainMappingResponse`: Response model
- `ContentSchema`: Complete schema structure
- `EntitySchema`: Entity definition
- `FieldSchema`: Field definition
- `RelationshipSchema`: Relationship definition
- `StreamingResponse`: Streaming chunk model

## Testing

Run tests with pytest:

```bash
pytest tests/unit/skills/test_domain_mapping.py -v
```

## Example Interaction

**User**: "I'm a writer and want to create my author website"

**Assistant**: "Wonderful! As a writer, you'll want to showcase your work effectively. Let me help you structure your author website. What types of writing do you primarily focus on? For example, are you working on books, articles, poetry, or a combination?"

**User**: "I write novels and blog posts, and I also do speaking engagements at conferences"

**Assistant**: "Perfect! For your author website, I suggest these main content types:
- **Books**: For your novels with covers, synopses, and purchase links
- **Blog Posts**: For your articles and writing insights
- **Events**: For your speaking engagements and conferences
- **About**: Your author bio and journey

Does this cover what you need, or would you like to add anything else?"

[Conversation continues to define fields and relationships...]

## Error Handling

The skill handles various edge cases:
- Ambiguous professions
- Invalid field types
- Missing required information
- API errors with graceful fallbacks
- Complex relationship scenarios

## Best Practices

1. **Start Broad**: Let the skill discover the profession before diving into details
2. **Use Session IDs**: Maintain unique session IDs for conversation continuity
3. **Stream for UX**: Use streaming for better user experience in interactive applications
4. **Validate Output**: Review the generated schema before implementation
5. **Iterate**: Use the conversation to refine and improve the structure

## License

Part of the Kirby Gen portfolio generation system.