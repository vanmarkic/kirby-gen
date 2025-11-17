#!/usr/bin/env python3
"""
Example usage of the Domain Mapping Skill
Demonstrates both streaming and non-streaming conversation flows
"""

import asyncio
import json
import os
from typing import AsyncGenerator

from skill import DomainMappingSkill
from models import DomainMappingInput, StreamingResponse, ConversationState


async def example_streaming_conversation():
    """Example of streaming conversation flow"""
    print("\n=== STREAMING CONVERSATION EXAMPLE ===\n")

    # Initialize the skill (you'll need an actual Anthropic API key)
    api_key = os.getenv("ANTHROPIC_API_KEY", "your-api-key-here")
    skill = DomainMappingSkill(api_key=api_key)

    session_id = "example-session-001"

    # Simulate conversation turns
    conversation = [
        "Hi, I'm a photographer and I want to build my portfolio website",
        "I specialize in landscape and wildlife photography. I want to showcase my photo collections, individual shots, and upcoming exhibitions",
        "For photos, I need title, the image itself, description, location where taken, camera settings, and tags",
        "Yes, photos should belong to galleries, and galleries can have multiple photos. Also, photos can have multiple tags",
        "That looks great! Let's finalize this structure"
    ]

    for user_message in conversation:
        print(f"\nUSER: {user_message}")
        print("\nASSISTANT: ", end="")

        # Create input
        input_data = DomainMappingInput(
            user_message=user_message,
            session_id=session_id
        )

        # Process with streaming
        response_text = ""
        async for chunk in await skill.process_conversation(input_data, stream=True):
            if chunk.type == "message":
                print(chunk.content, end="", flush=True)
                response_text += chunk.content
            elif chunk.type == "schema_update":
                print("\n\n[Schema Generated]")
                print(json.dumps(chunk.data["schema"], indent=2)[:500] + "...")
            elif chunk.type == "state_change":
                print(f"\n[State changed to: {chunk.data['state']}]")

        await asyncio.sleep(1)  # Brief pause between turns

    print("\n\n=== CONVERSATION COMPLETE ===")


async def example_non_streaming_conversation():
    """Example of non-streaming conversation flow"""
    print("\n=== NON-STREAMING CONVERSATION EXAMPLE ===\n")

    api_key = os.getenv("ANTHROPIC_API_KEY", "your-api-key-here")
    skill = DomainMappingSkill(api_key=api_key)

    session_id = "example-session-002"

    # First turn: Identify profession
    input1 = DomainMappingInput(
        user_message="I'm a writer and blogger",
        session_id=session_id
    )

    response1 = await skill.process_conversation(input1, stream=False)
    print(f"Assistant: {response1.message}")
    print(f"Suggested questions: {response1.suggested_questions}")
    print(f"Current state: {response1.current_state}\n")

    # Second turn: Discover entities
    input2 = DomainMappingInput(
        user_message="I write blog posts, poetry, and occasionally books. I also speak at literary events",
        session_id=session_id
    )

    response2 = await skill.process_conversation(input2, stream=False)
    print(f"Assistant: {response2.message}")
    print(f"Needs input on: {response2.needs_input_on}\n")

    # Continue until schema is complete
    if response2.current_state == ConversationState.COMPLETE and response2.content_schema:
        print("\nGenerated Schema:")
        print(json.dumps(response2.content_schema.model_dump(by_alias=True), indent=2))

    # Get conversation history
    history = skill.get_conversation_history(session_id)
    print(f"\nConversation had {len(history)} turns")


async def example_schema_improvement():
    """Example of suggesting improvements to existing schema"""
    print("\n=== SCHEMA IMPROVEMENT EXAMPLE ===\n")

    api_key = os.getenv("ANTHROPIC_API_KEY", "your-api-key-here")
    skill = DomainMappingSkill(api_key=api_key)

    # Create a basic schema
    from models import ContentSchema, EntitySchema, FieldSchema, SchemaMetadata, GenericFieldType

    basic_schema = ContentSchema(
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
                    ),
                    FieldSchema(
                        id="description",
                        name="description",
                        label="Description",
                        type=GenericFieldType.TEXTAREA,
                        required=True
                    )
                ]
            )
        ],
        relationships=[],
        metadata=SchemaMetadata(name="Basic Portfolio")
    )

    # Get improvement suggestions
    suggestions = await skill.suggest_improvements(basic_schema)

    print("Improvement Suggestions:")
    for i, suggestion in enumerate(suggestions, 1):
        print(f"{i}. {suggestion}")


def example_profession_templates():
    """Example of using profession templates"""
    print("\n=== PROFESSION TEMPLATES EXAMPLE ===\n")

    from prompts import get_profession_templates

    templates = get_profession_templates()

    print("Available profession templates:")
    for profession, template in templates.items():
        print(f"\n{profession.upper()} Portfolio:")
        print(f"  Type: {template['portfolio_type']}")
        print(f"  Common entities:")
        for entity in template['entities']:
            print(f"    - {entity['name']}: {entity['description']}")


def example_relationship_suggestions():
    """Example of getting relationship suggestions"""
    print("\n=== RELATIONSHIP SUGGESTIONS EXAMPLE ===\n")

    from prompts import get_relationship_suggestions

    # Designer portfolio entities
    entities = ["Project", "Client", "Testimonial", "Service", "Tool"]

    suggestions = get_relationship_suggestions(entities)

    print(f"For entities: {', '.join(entities)}")
    print("\nSuggested relationships:")
    for suggestion in suggestions:
        print(f"  - {suggestion['from']} -> {suggestion['to']} ({suggestion['type']}): {suggestion['label']}")


async def main():
    """Run all examples"""
    print("=" * 60)
    print("DOMAIN MAPPING SKILL EXAMPLES")
    print("=" * 60)

    # Note: These examples with actual API calls require a valid Anthropic API key
    # Set ANTHROPIC_API_KEY environment variable or replace with your key

    # Run non-API examples
    example_profession_templates()
    example_relationship_suggestions()

    # Uncomment these to run with actual API (requires valid key):
    # await example_non_streaming_conversation()
    # await example_streaming_conversation()
    # await example_schema_improvement()

    print("\n" + "=" * 60)
    print("EXAMPLES COMPLETE")
    print("=" * 60)


if __name__ == "__main__":
    asyncio.run(main())