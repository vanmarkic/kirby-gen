"""
Skills Server - FastAPI Application
Provides HTTP endpoints for AI skills using Claude
"""

import logging
import time
from typing import Dict, Any, Union, Optional
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from src.config import config
from src.skills.domain_mapping.skill import DomainMappingSkill
from src.skills.domain_mapping.models import DomainMappingInput
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
