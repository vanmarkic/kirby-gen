"""
Domain Mapping Skill - Conversational Portfolio Structure Discovery
Uses Claude Opus to guide users through creating their portfolio content schema
"""

import json
import asyncio
from typing import Dict, List, Optional, Any, AsyncGenerator
from datetime import datetime
import logging
from anthropic import AsyncAnthropic, Anthropic
from anthropic.types import MessageStreamEvent

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
    GenericFieldType
)
from .prompts import (
    SYSTEM_PROMPT,
    PROFESSION_DISCOVERY_PROMPT,
    ENTITY_DISCOVERY_PROMPT_TEMPLATE,
    FIELD_DISCOVERY_PROMPT_TEMPLATE,
    RELATIONSHIP_DISCOVERY_PROMPT_TEMPLATE,
    VALIDATION_PROMPT_TEMPLATE,
    get_profession_templates,
    get_relationship_suggestions,
    format_entity_summary,
    format_relationship_summary
)

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Claude Opus model identifier
CLAUDE_OPUS_MODEL = "claude-opus-4-20250514"


class DomainMappingSkill:
    """
    Conversational AI agent that guides users through discovering
    their portfolio structure and generates a ContentSchema
    """

    def __init__(self, api_key: str):
        """
        Initialize the Domain Mapping Skill

        Args:
            api_key: Anthropic API key for Claude access
        """
        self.client = AsyncAnthropic(api_key=api_key)
        self.sync_client = Anthropic(api_key=api_key)
        self.conversations: Dict[str, ConversationContext] = {}
        self.profession_templates = get_profession_templates()

    async def process_conversation(
        self,
        input_data: DomainMappingInput,
        stream: bool = True
    ) -> AsyncGenerator[StreamingResponse, None] | DomainMappingResponse:
        """
        Process a conversation turn with the user

        Args:
            input_data: User input and context
            stream: Whether to stream responses

        Returns:
            Either a streaming generator or complete response
        """
        # Get or create conversation context
        context = self._get_or_create_context(input_data.session_id)

        # Update context with any provided data
        if input_data.profession:
            context.profession = input_data.profession
        if input_data.context:
            for key, value in input_data.context.items():
                setattr(context, key, value, None)

        # Add user message to history
        context.conversation_history.append({
            "role": "user",
            "content": input_data.user_message
        })

        # Determine next conversation state
        context = self._determine_next_state(context, input_data.user_message)

        # Generate appropriate prompt based on state
        prompt = self._generate_prompt_for_state(context, input_data.user_message)

        if stream:
            # Return streaming response
            return self._stream_response(context, prompt)
        else:
            # Return complete response
            return await self._get_complete_response(context, prompt)

    async def _stream_response(
        self,
        context: ConversationContext,
        prompt: str
    ) -> AsyncGenerator[StreamingResponse, None]:
        """
        Stream responses from Claude Opus

        Args:
            context: Current conversation context
            prompt: Generated prompt for Claude

        Yields:
            StreamingResponse chunks
        """
        try:
            # Create streaming message
            stream = await self.client.messages.create(
                model=CLAUDE_OPUS_MODEL,
                max_tokens=4096,
                temperature=0.7,
                system=SYSTEM_PROMPT,
                messages=[
                    {"role": msg["role"], "content": msg["content"]}
                    for msg in context.conversation_history[:-1]  # Exclude last user message
                ] + [{"role": "user", "content": prompt}],
                stream=True
            )

            accumulated_response = ""

            async for event in stream:
                if event.type == "content_block_delta":
                    chunk = event.delta.text
                    accumulated_response += chunk

                    # Stream message chunks
                    yield StreamingResponse(
                        type="message",
                        content=chunk,
                        timestamp=datetime.now()
                    )

            # Parse the complete response
            response_data = self._parse_claude_response(accumulated_response)

            # Update context based on response
            context = self._update_context_from_response(context, response_data)

            # Stream state change
            yield StreamingResponse(
                type="state_change",
                data={"state": context.state.value},
                timestamp=datetime.now()
            )

            # If schema is complete, stream it
            if context.state == ConversationState.COMPLETE:
                schema = self._build_content_schema(context)
                yield StreamingResponse(
                    type="schema_update",
                    data={"schema": schema.model_dump(by_alias=True)},
                    timestamp=datetime.now()
                )

            # Stream completion
            yield StreamingResponse(
                type="complete",
                timestamp=datetime.now()
            )

            # Save conversation context
            self.conversations[context.session_id] = context

        except Exception as e:
            logger.error(f"Error in streaming response: {str(e)}")
            yield StreamingResponse(
                type="message",
                content=f"I encountered an error: {str(e)}. Let's try again.",
                timestamp=datetime.now()
            )

    async def _get_complete_response(
        self,
        context: ConversationContext,
        prompt: str
    ) -> DomainMappingResponse:
        """
        Get a complete response from Claude Opus

        Args:
            context: Current conversation context
            prompt: Generated prompt for Claude

        Returns:
            Complete domain mapping response
        """
        try:
            # Create message
            message = await self.client.messages.create(
                model=CLAUDE_OPUS_MODEL,
                max_tokens=4096,
                temperature=0.7,
                system=SYSTEM_PROMPT,
                messages=[
                    {"role": msg["role"], "content": msg["content"]}
                    for msg in context.conversation_history[:-1]
                ] + [{"role": "user", "content": prompt}]
            )

            # Parse response
            response_data = self._parse_claude_response(message.content[0].text)

            # Update context
            context = self._update_context_from_response(context, response_data)

            # Build response
            response = DomainMappingResponse(
                message=response_data.get("message", ""),
                suggested_questions=response_data.get("suggested_questions", []),
                current_state=context.state,
                needs_input_on=response_data.get("needs_input_on"),
                examples=response_data.get("examples")
            )

            # Add schema if complete
            if context.state == ConversationState.COMPLETE:
                response.content_schema = self._build_content_schema(context)

            # Save context
            self.conversations[context.session_id] = context

            return response

        except Exception as e:
            logger.error(f"Error getting response: {str(e)}")
            return DomainMappingResponse(
                message=f"I encountered an error: {str(e)}. Let's try again.",
                suggested_questions=["Can you repeat your last message?"],
                current_state=context.state
            )

    def _get_or_create_context(self, session_id: str) -> ConversationContext:
        """Get existing conversation context or create new one"""
        if session_id not in self.conversations:
            self.conversations[session_id] = ConversationContext(
                session_id=session_id,
                state=ConversationState.INITIAL
            )
        return self.conversations[session_id]

    def _determine_next_state(
        self,
        context: ConversationContext,
        user_message: str
    ) -> ConversationContext:
        """Determine the next conversation state based on context"""
        current_state = context.state

        if current_state == ConversationState.INITIAL:
            context.state = ConversationState.DISCOVERING_PROFESSION

        elif current_state == ConversationState.DISCOVERING_PROFESSION:
            if context.profession:
                context.state = ConversationState.DISCOVERING_ENTITIES

        elif current_state == ConversationState.DISCOVERING_ENTITIES:
            if len(context.discovered_entities) > 0:
                # Check if user wants to add more or move to fields
                if any(word in user_message.lower() for word in ["enough", "done", "next", "continue"]):
                    context.state = ConversationState.DISCOVERING_FIELDS

        elif current_state == ConversationState.DISCOVERING_FIELDS:
            # Check if all entities have fields defined
            all_have_fields = all(
                len(entity.fields) > 0 for entity in context.discovered_entities
            )
            if all_have_fields:
                context.state = ConversationState.DISCOVERING_RELATIONSHIPS

        elif current_state == ConversationState.DISCOVERING_RELATIONSHIPS:
            if any(word in user_message.lower() for word in ["done", "finish", "complete", "validate"]):
                context.state = ConversationState.VALIDATING

        elif current_state == ConversationState.VALIDATING:
            if any(word in user_message.lower() for word in ["confirm", "yes", "looks good", "perfect"]):
                context.state = ConversationState.COMPLETE

        return context

    def _generate_prompt_for_state(
        self,
        context: ConversationContext,
        user_message: str
    ) -> str:
        """Generate appropriate prompt based on conversation state"""
        state = context.state

        if state == ConversationState.DISCOVERING_PROFESSION:
            return f"{PROFESSION_DISCOVERY_PROMPT}\n\nUser said: {user_message}"

        elif state == ConversationState.DISCOVERING_ENTITIES:
            profession = context.profession or "professional"
            portfolio_type = context.portfolio_type or "portfolio"
            template = self.profession_templates.get(profession.lower(), {})
            suggested_entities = json.dumps(
                template.get("entities", []), indent=2
            )
            current_entities = [e.name for e in context.discovered_entities]

            return ENTITY_DISCOVERY_PROMPT_TEMPLATE.format(
                profession=profession,
                portfolio_type=portfolio_type,
                suggested_entities=suggested_entities,
                current_entities=", ".join(current_entities) if current_entities else "None yet"
            ) + f"\n\nUser said: {user_message}"

        elif state == ConversationState.DISCOVERING_FIELDS:
            # Find entity that needs fields
            entity_needing_fields = None
            for entity in context.discovered_entities:
                if len(entity.fields) == 0:
                    entity_needing_fields = entity
                    break

            if entity_needing_fields:
                template = self.profession_templates.get(
                    (context.profession or "").lower(), {}
                )
                suggested_fields = json.dumps(
                    template.get("common_fields", {}).get(entity_needing_fields.name, []),
                    indent=2
                )

                return FIELD_DISCOVERY_PROMPT_TEMPLATE.format(
                    entity_name=entity_needing_fields.name,
                    entity_description=entity_needing_fields.description or "",
                    suggested_fields=suggested_fields,
                    current_fields="None yet"
                ) + f"\n\nUser said: {user_message}"

        elif state == ConversationState.DISCOVERING_RELATIONSHIPS:
            entities_list = [e.name for e in context.discovered_entities]
            suggestions = get_relationship_suggestions(entities_list)
            current_rels = [
                f"{r.from_entity} -> {r.to_entity}"
                for r in context.discovered_relationships
            ]

            return RELATIONSHIP_DISCOVERY_PROMPT_TEMPLATE.format(
                entities_list=", ".join(entities_list),
                current_relationships=", ".join(current_rels) if current_rels else "None yet"
            ) + f"\n\nSuggested relationships: {json.dumps(suggestions, indent=2)}"
            + f"\n\nUser said: {user_message}"

        elif state == ConversationState.VALIDATING:
            return VALIDATION_PROMPT_TEMPLATE.format(
                entities_summary=format_entity_summary(
                    [e.model_dump() for e in context.discovered_entities]
                ),
                relationships_summary=format_relationship_summary(
                    [r.model_dump() for r in context.discovered_relationships]
                ),
                total_fields=sum(len(e.fields) for e in context.discovered_entities)
            ) + f"\n\nUser said: {user_message}"

        return f"Continue the conversation based on the current context.\n\nUser said: {user_message}"

    def _parse_claude_response(self, response_text: str) -> Dict[str, Any]:
        """Parse Claude's JSON response"""
        try:
            # Try to extract JSON from the response
            if "```json" in response_text:
                json_start = response_text.find("```json") + 7
                json_end = response_text.find("```", json_start)
                json_str = response_text[json_start:json_end].strip()
            else:
                # Assume entire response is JSON
                json_str = response_text.strip()

            return json.loads(json_str)
        except json.JSONDecodeError:
            # If not valid JSON, return as message
            return {
                "message": response_text,
                "suggested_questions": [],
                "current_state": "unknown"
            }

    def _update_context_from_response(
        self,
        context: ConversationContext,
        response_data: Dict[str, Any]
    ) -> ConversationContext:
        """Update conversation context based on Claude's response"""
        # Add assistant message to history
        context.conversation_history.append({
            "role": "assistant",
            "content": json.dumps(response_data)
        })

        # Update entities if provided
        if "entities" in response_data:
            for entity_data in response_data["entities"]:
                # Convert to EntitySchema
                entity = EntitySchema(**entity_data)
                # Check if entity already exists
                existing = next(
                    (e for e in context.discovered_entities if e.id == entity.id),
                    None
                )
                if existing:
                    # Update existing entity
                    idx = context.discovered_entities.index(existing)
                    context.discovered_entities[idx] = entity
                else:
                    context.discovered_entities.append(entity)

        # Update relationships if provided
        if "relationships" in response_data:
            for rel_data in response_data["relationships"]:
                relationship = RelationshipSchema(**rel_data)
                # Check if relationship already exists
                existing = next(
                    (r for r in context.discovered_relationships if r.id == relationship.id),
                    None
                )
                if not existing:
                    context.discovered_relationships.append(relationship)

        # Update profession if discovered
        if "profession" in response_data:
            context.profession = response_data["profession"]
        if "portfolio_type" in response_data:
            context.portfolio_type = response_data["portfolio_type"]

        # Update needs clarification
        if "needs_input_on" in response_data:
            context.needs_clarification = response_data["needs_input_on"]

        return context

    def _build_content_schema(self, context: ConversationContext) -> ContentSchema:
        """Build the final ContentSchema from conversation context"""
        metadata = SchemaMetadata(
            name=f"{context.profession} Portfolio Schema",
            description=f"Content schema for {context.portfolio_type}",
            author="Domain Mapping Skill",
            created_at=datetime.now(),
            updated_at=datetime.now()
        )

        return ContentSchema(
            version="1.0.0",
            entities=context.discovered_entities,
            relationships=context.discovered_relationships,
            metadata=metadata
        )

    def get_conversation_history(self, session_id: str) -> List[Dict[str, str]]:
        """Get conversation history for a session"""
        context = self.conversations.get(session_id)
        if context:
            return context.conversation_history
        return []

    def reset_conversation(self, session_id: str) -> None:
        """Reset a conversation session"""
        if session_id in self.conversations:
            del self.conversations[session_id]

    async def suggest_improvements(
        self,
        schema: ContentSchema
    ) -> List[str]:
        """Suggest improvements to an existing schema"""
        prompt = f"""Review this portfolio schema and suggest improvements:

{json.dumps(schema.model_dump(by_alias=True), indent=2)}

Suggest 3-5 specific improvements that would make this schema more effective.
Focus on:
1. Missing essential fields or entities
2. Relationships that could improve navigation
3. Data organization improvements
4. SEO and discoverability enhancements

Return as a JSON array of suggestion strings."""

        try:
            message = await self.client.messages.create(
                model=CLAUDE_OPUS_MODEL,
                max_tokens=1024,
                temperature=0.7,
                system="You are a portfolio structure expert. Provide concise, actionable suggestions.",
                messages=[{"role": "user", "content": prompt}]
            )

            suggestions = json.loads(message.content[0].text)
            return suggestions if isinstance(suggestions, list) else []

        except Exception as e:
            logger.error(f"Error getting suggestions: {str(e)}")
            return []