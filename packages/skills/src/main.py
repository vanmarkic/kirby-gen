"""
Skills Server - FastAPI Application
Provides HTTP endpoints for AI skills using Claude
"""

import logging
import time
from datetime import datetime
from typing import Dict, Any, Union, Optional
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

from src.config import config
from src.skills.domain_mapping.skill import DomainMappingSkill
from src.skills.domain_mapping.models import DomainMappingInput, ContentSchema
from src.middleware.ip_whitelist import ip_whitelist_middleware

# Configure logging
logging.basicConfig(
    level=getattr(logging, config.log_level),
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

# Create FastAPI app
app = FastAPI(
    title="Kirby-Gen Skills Server",
    description="AI-powered skills for portfolio generation",
    version="0.1.0"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify allowed origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Add IP whitelist middleware (FIRST - before other processing)
app.middleware("http")(ip_whitelist_middleware)


# Response models
class SkillResponse(BaseModel):
    """Standard skill response format"""
    success: bool
    data: Any = None
    error: Optional[Dict[str, Any]] = None
    metadata: Optional[Dict[str, Any]] = None


class DomainMappingTestInput(BaseModel):
    """Simplified input for test-only domain mapping endpoint"""
    description: str = Field(description="Description of the portfolio/website requirements")
    profession: Optional[str] = Field(default=None, description="User's profession (optional)")


# Global skill instances (initialized lazily)
_domain_mapping_skill: Optional[DomainMappingSkill] = None


def get_domain_mapping_skill() -> DomainMappingSkill:
    """Get or create domain mapping skill instance"""
    global _domain_mapping_skill
    if _domain_mapping_skill is None:
        client = config.get_async_client()
        _domain_mapping_skill = DomainMappingSkill(api_key=config.claude_api_key)
        # Replace the client with our configured one (API or CLI)
        _domain_mapping_skill.client = client
        if hasattr(client, '__class__') and 'CLI' not in client.__class__.__name__:
            # Only set sync client if using API
            _domain_mapping_skill.sync_client = config.get_sync_client()
        logger.info("Domain mapping skill initialized")
    return _domain_mapping_skill


# Middleware for request logging and timing
@app.middleware("http")
async def log_requests(request: Request, call_next):
    """Log all requests with timing"""
    start_time = time.time()
    logger.info(f"Request: {request.method} {request.url.path}")

    response = await call_next(request)

    duration = time.time() - start_time
    logger.info(
        f"Response: {request.method} {request.url.path} - "
        f"Status: {response.status_code} - Duration: {duration:.2f}s"
    )

    return response


# Health check endpoint
@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "version": "0.1.0",
        "environment": config.node_env,
        "using_cli": config.use_cli
    }


# Skills endpoints
@app.post("/skills/domain-mapping", response_model=SkillResponse)
async def domain_mapping_skill_endpoint(input_data: DomainMappingInput):
    """
    Domain mapping skill endpoint
    Guides users through portfolio structure discovery
    """
    start_time = time.time()
    skill = get_domain_mapping_skill()

    try:
        logger.info(f"Processing domain mapping request for session: {input_data.session_id}")

        # Process conversation (non-streaming for now)
        response = await skill.process_conversation(input_data, stream=False)

        duration = time.time() - start_time

        return SkillResponse(
            success=True,
            data={
                "message": response.message,
                "suggestedQuestions": response.suggested_questions,
                "currentState": response.current_state.value if response.current_state else None,
                "needsInputOn": response.needs_input_on,
                "examples": response.examples,
                "contentSchema": response.content_schema.model_dump(by_alias=True) if response.content_schema else None,
                "domainModel": response.content_schema.model_dump(by_alias=True) if response.content_schema else None
            },
            metadata={
                "duration": duration,
                "session_id": input_data.session_id
            }
        )

    except Exception as e:
        logger.error(f"Domain mapping skill failed: {str(e)}", exc_info=True)
        duration = time.time() - start_time

        return SkillResponse(
            success=False,
            error={
                "code": "SKILL_ERROR",
                "message": str(e),
                "details": {"session_id": input_data.session_id}
            },
            metadata={"duration": duration}
        )


@app.post("/skills/domain-mapping-test", response_model=SkillResponse)
async def domain_mapping_test_endpoint(input_data: DomainMappingTestInput):
    """
    TEST ONLY: Direct domain mapping endpoint for integration tests
    Generates a complete domain model from a single description without conversation
    """
    start_time = time.time()
    skill = get_domain_mapping_skill()

    try:
        logger.info(f"Processing test domain mapping request: {input_data.description[:100]}...")

        # Create a highly optimized prompt for direct schema generation
        prompt = f"""You are a domain modeling expert. Generate a complete, production-ready content schema for this portfolio/website:

DESCRIPTION:
{input_data.description}

{f'PROFESSION: {input_data.profession}' if input_data.profession else ''}

TASK: Return a complete JSON schema with entities, fields, and relationships. Be comprehensive and specific.

REQUIREMENTS:
1. Identify 3-7 main entities (content types) based on the description
2. Each entity must have 5-15 relevant fields with proper types
3. Define relationships between entities (one-to-many, many-to-many, etc.)
4. Use generic field types: text, textarea, richtext, number, date, image, gallery, select, relation, etc.
5. Include validation rules and help text where appropriate
6. Make it production-ready - not placeholder or example data

Return ONLY valid JSON in this exact format:
{{{{
  "version": "1.0.0",
  "entities": [
    {{{{
      "id": "entity-id",
      "name": "EntityName",
      "pluralName": "EntityNames",
      "description": "Description of what this entity represents",
      "displayField": "title",
      "icon": "icon-name",
      "sortable": true,
      "timestamps": true,
      "slugSource": "title",
      "fields": [
        {{{{
          "id": "field-id",
          "name": "fieldName",
          "label": "Field Label",
          "type": "text",
          "required": true,
          "helpText": "Help text",
          "placeholder": "Placeholder text",
          "width": "full",
          "options": {{{{
            "minLength": 3,
            "maxLength": 200
          }}}},
          "validation": {{{{
            "required": true
          }}}}
        }}}}
      ]
    }}}}
  ],
  "relationships": [
    {{{{
      "id": "rel-id",
      "type": "one-to-many",
      "from": "EntityName",
      "to": "RelatedEntity",
      "label": "has many",
      "inversLabel": "belongs to",
      "required": false,
      "cascadeDelete": false
    }}}}
  ],
  "metadata": {{{{
    "name": "Portfolio Schema",
    "description": "Schema description",
    "author": "Domain Mapping Test",
    "createdAt": "{datetime.now().isoformat()}",
    "updatedAt": "{datetime.now().isoformat()}"
  }}}}
}}}}

Generate the schema now. Return ONLY the JSON, no explanation."""

        # Use sync client for simpler error handling
        if hasattr(skill.client, '__class__') and 'CLI' in skill.client.__class__.__name__:
            # CLI adapter
            message = await skill.client.messages.create(
                model=config.claude_model,
                max_tokens=8000,
                temperature=0.3,
                system="You are a domain modeling expert. Generate complete, production-ready schemas. Return only valid JSON.",
                messages=[{"role": "user", "content": prompt}]
            )
        else:
            # API client
            message = await skill.client.messages.create(
                model=config.claude_model,
                max_tokens=8000,
                temperature=0.3,
                system="You are a domain modeling expert. Generate complete, production-ready schemas. Return only valid JSON.",
                messages=[{"role": "user", "content": prompt}]
            )

        # Extract JSON from response
        response_text = message.content[0].text

        # Try to extract JSON
        json_str = response_text.strip()
        if "```json" in response_text:
            json_start = response_text.find("```json") + 7
            json_end = response_text.find("```", json_start)
            json_str = response_text[json_start:json_end].strip()
        elif "```" in response_text:
            json_start = response_text.find("```") + 3
            json_end = response_text.find("```", json_start)
            json_str = response_text[json_start:json_end].strip()

        # Parse and validate schema
        import json as json_lib
        schema_dict = json_lib.loads(json_str)

        # Validate against ContentSchema model
        content_schema = ContentSchema(**schema_dict)

        duration = time.time() - start_time

        return SkillResponse(
            success=True,
            data={
                "contentSchema": content_schema.model_dump(by_alias=True),
                "domainModel": content_schema.model_dump(by_alias=True)
            },
            metadata={
                "duration": duration,
                "test_mode": True,
                "entities_count": len(content_schema.entities),
                "relationships_count": len(content_schema.relationships)
            }
        )

    except Exception as e:
        logger.error(f"Domain mapping test failed: {str(e)}", exc_info=True)
        duration = time.time() - start_time

        return SkillResponse(
            success=False,
            error={
                "code": "TEST_SKILL_ERROR",
                "message": str(e),
                "details": {"description": input_data.description[:200]}
            },
            metadata={"duration": duration}
        )


@app.post("/skills/content-structuring", response_model=SkillResponse)
async def content_structuring_skill_endpoint(input_data: Dict[str, Any]):
    """
    Content structuring skill endpoint
    Maps unstructured content to entity schema
    """
    start_time = time.time()

    try:
        logger.info("Processing content structuring request")

        # TODO: Implement content structuring skill
        # For now, return a placeholder
        return SkillResponse(
            success=True,
            data={
                "structuredContent": {
                    "message": "Content structuring not yet implemented",
                    "placeholder": True
                }
            },
            metadata={
                "duration": time.time() - start_time,
                "skill": "content-structuring"
            }
        )

    except Exception as e:
        logger.error(f"Content structuring skill failed: {str(e)}", exc_info=True)

        return SkillResponse(
            success=False,
            error={
                "code": "SKILL_ERROR",
                "message": str(e)
            },
            metadata={"duration": time.time() - start_time}
        )


@app.post("/skills/design-automation", response_model=SkillResponse)
async def design_automation_skill_endpoint(input_data: Dict[str, Any]):
    """
    Design automation skill endpoint
    Extracts design tokens from branding assets and moodboards
    """
    start_time = time.time()

    try:
        logger.info("Processing design automation request")

        # TODO: Implement design automation skill
        # For now, return a placeholder
        return SkillResponse(
            success=True,
            data={
                "designSystem": {
                    "message": "Design automation not yet implemented",
                    "placeholder": True,
                    "tokens": {
                        "colors": {},
                        "typography": {},
                        "spacing": {}
                    }
                }
            },
            metadata={
                "duration": time.time() - start_time,
                "skill": "design-automation"
            }
        )

    except Exception as e:
        logger.error(f"Design automation skill failed: {str(e)}", exc_info=True)

        return SkillResponse(
            success=False,
            error={
                "code": "SKILL_ERROR",
                "message": str(e)
            },
            metadata={"duration": time.time() - start_time}
        )


# Error handlers
@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    """Handle HTTP exceptions"""
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "success": False,
            "error": {
                "code": "HTTP_ERROR",
                "message": exc.detail,
                "status_code": exc.status_code
            }
        }
    )


@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    """Handle general exceptions"""
    logger.error(f"Unhandled exception: {str(exc)}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={
            "success": False,
            "error": {
                "code": "INTERNAL_ERROR",
                "message": "An internal error occurred",
                "details": str(exc)
            }
        }
    )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=config.skills_port,
        reload=True,
        log_level=config.log_level.lower()
    )
