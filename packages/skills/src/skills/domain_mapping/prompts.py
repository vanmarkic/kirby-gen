"""
Conversation prompts and templates for Domain Mapping Skill
Provides structured prompts for Claude Opus to guide portfolio discovery
"""

from typing import Dict, List, Any


SYSTEM_PROMPT = """You are a friendly and knowledgeable portfolio structure consultant helping users design their professional portfolio website. Your goal is to guide them through discovering the perfect content structure for their unique needs.

Your approach:
1. Be conversational and encouraging - make this feel like a helpful consultation, not a form
2. Ask one focused question at a time to avoid overwhelming the user
3. Suggest common patterns based on their profession but remain flexible
4. Validate their choices and explain why certain structures work well
5. Use examples to illustrate concepts when helpful
6. Always output valid JSON structures that conform to the ContentSchema format

Key principles:
- Start broad (profession/portfolio type) then narrow down to specifics
- Suggest industry best practices but adapt to unique needs
- Keep technical terms minimal - use plain language
- Validate that relationships between entities make logical sense
- Ensure all required information is gathered before finalizing

Output format:
Your responses should be in JSON format with these fields:
{
  "message": "Your conversational response to the user",
  "suggested_questions": ["List of 2-3 follow-up questions the user might want to ask"],
  "current_state": "The current conversation state",
  "needs_input_on": ["Specific areas requiring user input"],
  "examples": [{"entity": "name", "sample_data": {...}}] // When relevant
}

When the schema is complete, include a "schema" field with the full ContentSchema structure.
"""


PROFESSION_DISCOVERY_PROMPT = """The user is starting to build their portfolio. Help them identify their profession and portfolio type.

Consider these common patterns:
- Creative professionals (designer, artist, photographer)
- Writers and content creators (author, blogger, journalist, poet)
- Technical professionals (developer, data scientist, engineer)
- Business professionals (consultant, marketer, entrepreneur)
- Academic professionals (researcher, professor, teacher)
- Service professionals (therapist, coach, trainer)

Ask about:
1. Their primary profession or field
2. What they want to showcase (work samples, services, achievements, etc.)
3. Their target audience (potential clients, employers, peers, etc.)

Based on their response, suggest an appropriate portfolio structure."""


ENTITY_DISCOVERY_PROMPT_TEMPLATE = """Based on the user being a {profession} who wants to create a {portfolio_type} portfolio, help them discover what entities (content types) they need.

Common entities for {profession}:
{suggested_entities}

Guide them to think about:
1. Main content they want to showcase
2. Supporting information (about, services, testimonials)
3. How they want to organize their work
4. Any unique requirements for their field

Current entities discovered: {current_entities}

Help them refine and expand this list based on their specific needs."""


FIELD_DISCOVERY_PROMPT_TEMPLATE = """Now help the user define fields for the entity: {entity_name}

This entity is described as: {entity_description}

Suggest appropriate fields considering:
1. Essential information (title, description, date, etc.)
2. Media needs (images, documents, videos)
3. Categorization (tags, categories, status)
4. SEO and discoverability (slug, meta description)
5. Relationships to other entities

Common fields for similar entities:
{suggested_fields}

Current fields defined: {current_fields}

Guide them to think about what information is truly necessary vs. nice-to-have."""


RELATIONSHIP_DISCOVERY_PROMPT_TEMPLATE = """Help the user define relationships between their entities.

Current entities:
{entities_list}

Already defined relationships:
{current_relationships}

Guide them to consider:
1. Which entities naturally connect (e.g., projects have categories, posts have authors)
2. One-to-many vs many-to-many relationships
3. Required vs optional relationships
4. How users will navigate between related content

Suggest logical relationships based on their portfolio structure."""


VALIDATION_PROMPT_TEMPLATE = """Review and validate the complete portfolio structure with the user.

Generated schema summary:
- Entities: {entities_summary}
- Relationships: {relationships_summary}
- Total fields: {total_fields}

Check for:
1. Missing essential entities or fields
2. Overly complex structures that could be simplified
3. Logical consistency in relationships
4. Practical usability for content management

Present the schema in a clear, understandable way and ask if they want to adjust anything."""


def get_profession_templates() -> Dict[str, Dict[str, Any]]:
    """Returns common portfolio templates by profession"""
    return {
        "writer": {
            "portfolio_type": "Writing Portfolio",
            "entities": [
                {"name": "Book", "description": "Published or upcoming books"},
                {"name": "Article", "description": "Blog posts, articles, essays"},
                {"name": "Publication", "description": "Where works are published"},
                {"name": "Event", "description": "Readings, workshops, conferences"},
                {"name": "Award", "description": "Recognition and achievements"}
            ],
            "common_fields": {
                "Book": [
                    {"name": "title", "type": "text", "required": True},
                    {"name": "synopsis", "type": "textarea", "required": True},
                    {"name": "cover_image", "type": "image", "required": True},
                    {"name": "genre", "type": "select", "required": True},
                    {"name": "publication_date", "type": "date", "required": False},
                    {"name": "isbn", "type": "text", "required": False},
                    {"name": "purchase_links", "type": "list", "required": False}
                ]
            }
        },
        "designer": {
            "portfolio_type": "Design Portfolio",
            "entities": [
                {"name": "Project", "description": "Design projects and case studies"},
                {"name": "Client", "description": "Clients you've worked with"},
                {"name": "Service", "description": "Design services offered"},
                {"name": "Testimonial", "description": "Client feedback"},
                {"name": "Tool", "description": "Design tools and technologies"}
            ],
            "common_fields": {
                "Project": [
                    {"name": "title", "type": "text", "required": True},
                    {"name": "description", "type": "richtext", "required": True},
                    {"name": "featured_image", "type": "image", "required": True},
                    {"name": "gallery", "type": "gallery", "required": False},
                    {"name": "project_type", "type": "select", "required": True},
                    {"name": "year", "type": "number", "required": True},
                    {"name": "tools_used", "type": "multiselect", "required": False}
                ]
            }
        },
        "photographer": {
            "portfolio_type": "Photography Portfolio",
            "entities": [
                {"name": "Gallery", "description": "Photo collections or series"},
                {"name": "Photo", "description": "Individual photographs"},
                {"name": "Exhibition", "description": "Shows and exhibitions"},
                {"name": "Client", "description": "Commercial clients"},
                {"name": "Category", "description": "Photography categories"}
            ],
            "common_fields": {
                "Photo": [
                    {"name": "title", "type": "text", "required": True},
                    {"name": "image", "type": "image", "required": True},
                    {"name": "description", "type": "textarea", "required": False},
                    {"name": "location", "type": "location", "required": False},
                    {"name": "date_taken", "type": "date", "required": True},
                    {"name": "camera_settings", "type": "json", "required": False},
                    {"name": "tags", "type": "tags", "required": False}
                ]
            }
        },
        "developer": {
            "portfolio_type": "Developer Portfolio",
            "entities": [
                {"name": "Project", "description": "Software projects and applications"},
                {"name": "Skill", "description": "Technical skills and proficiencies"},
                {"name": "Experience", "description": "Work experience and positions"},
                {"name": "BlogPost", "description": "Technical articles and tutorials"},
                {"name": "Certification", "description": "Professional certifications"}
            ],
            "common_fields": {
                "Project": [
                    {"name": "name", "type": "text", "required": True},
                    {"name": "description", "type": "markdown", "required": True},
                    {"name": "screenshot", "type": "image", "required": False},
                    {"name": "tech_stack", "type": "multiselect", "required": True},
                    {"name": "github_url", "type": "url", "required": False},
                    {"name": "live_url", "type": "url", "required": False},
                    {"name": "status", "type": "select", "required": True}
                ]
            }
        },
        "artist": {
            "portfolio_type": "Art Portfolio",
            "entities": [
                {"name": "Artwork", "description": "Individual art pieces"},
                {"name": "Collection", "description": "Series or collections of work"},
                {"name": "Exhibition", "description": "Shows and exhibitions"},
                {"name": "Commission", "description": "Commissioned works"},
                {"name": "Medium", "description": "Artistic mediums and techniques"}
            ],
            "common_fields": {
                "Artwork": [
                    {"name": "title", "type": "text", "required": True},
                    {"name": "image", "type": "image", "required": True},
                    {"name": "description", "type": "richtext", "required": True},
                    {"name": "medium", "type": "select", "required": True},
                    {"name": "dimensions", "type": "text", "required": False},
                    {"name": "year_created", "type": "number", "required": True},
                    {"name": "price", "type": "number", "required": False},
                    {"name": "availability", "type": "select", "required": False}
                ]
            }
        }
    }


def get_relationship_suggestions(entities: List[str]) -> List[Dict[str, Any]]:
    """Suggests common relationships based on entity names"""
    suggestions = []

    # Common relationship patterns
    patterns = [
        {
            "if_has": ["Project", "Client"],
            "suggest": {"from": "Project", "to": "Client", "type": "many-to-one", "label": "created for"}
        },
        {
            "if_has": ["Project", "Category"],
            "suggest": {"from": "Project", "to": "Category", "type": "many-to-many", "label": "categorized as"}
        },
        {
            "if_has": ["BlogPost", "Tag"],
            "suggest": {"from": "BlogPost", "to": "Tag", "type": "many-to-many", "label": "tagged with"}
        },
        {
            "if_has": ["Photo", "Gallery"],
            "suggest": {"from": "Photo", "to": "Gallery", "type": "many-to-many", "label": "included in"}
        },
        {
            "if_has": ["Artwork", "Collection"],
            "suggest": {"from": "Artwork", "to": "Collection", "type": "many-to-many", "label": "part of"}
        },
        {
            "if_has": ["Book", "Publication"],
            "suggest": {"from": "Book", "to": "Publication", "type": "many-to-one", "label": "published by"}
        },
        {
            "if_has": ["Project", "Testimonial"],
            "suggest": {"from": "Testimonial", "to": "Project", "type": "many-to-one", "label": "about"}
        },
        {
            "if_has": ["Experience", "Skill"],
            "suggest": {"from": "Experience", "to": "Skill", "type": "many-to-many", "label": "utilized"}
        }
    ]

    for pattern in patterns:
        if all(entity in entities for entity in pattern["if_has"]):
            suggestions.append(pattern["suggest"])

    return suggestions


def format_entity_summary(entities: List[Dict[str, Any]]) -> str:
    """Formats entities for readable summary"""
    if not entities:
        return "No entities defined yet"

    summary_lines = []
    for entity in entities:
        field_count = len(entity.get("fields", []))
        summary_lines.append(
            f"- {entity['name']}: {entity.get('description', 'No description')} ({field_count} fields)"
        )

    return "\n".join(summary_lines)


def format_relationship_summary(relationships: List[Dict[str, Any]]) -> str:
    """Formats relationships for readable summary"""
    if not relationships:
        return "No relationships defined yet"

    summary_lines = []
    for rel in relationships:
        summary_lines.append(
            f"- {rel['from']} {rel['type']} {rel['to']}: {rel.get('label', 'related to')}"
        )

    return "\n".join(summary_lines)