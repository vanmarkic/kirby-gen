"""
Configuration for Skills Server
Handles environment variables and client initialization
"""

import os
from typing import Union
from anthropic import AsyncAnthropic, Anthropic
from src.utils.claude_cli_adapter import ClaudeCLIAdapter, ClaudeCLIAdapterSync
import logging

logger = logging.getLogger(__name__)


class Config:
    """Configuration class for skills server"""

    def __init__(self):
        # API Configuration
        self.node_env = os.getenv("NODE_ENV", "local")
        self.claude_api_key = os.getenv("CLAUDE_API_KEY", "")
        self.claude_model = os.getenv("CLAUDE_MODEL", "claude-opus-4-20250514")

        # Server configuration
        self.skills_port = int(os.getenv("SKILLS_PORT", "8001"))
        self.log_level = os.getenv("LOG_LEVEL", "info").upper()

        # Determine whether to use CLI or API
        self.use_cli = self.node_env == "local" and not self.claude_api_key

        logger.info(
            f"Skills configuration loaded: "
            f"env={self.node_env}, use_cli={self.use_cli}, "
            f"model={self.claude_model}"
        )

    def get_async_client(self) -> Union[AsyncAnthropic, ClaudeCLIAdapter]:
        """
        Get async Anthropic client or CLI adapter

        Returns:
            AsyncAnthropic if API key provided, ClaudeCLIAdapter for local dev
        """
        if self.use_cli:
            logger.info("Using Claude CLI adapter for local development")
            return ClaudeCLIAdapter()
        else:
            if not self.claude_api_key:
                raise ValueError(
                    "CLAUDE_API_KEY environment variable required when not using CLI mode. "
                    "Set NODE_ENV=local to use CLI instead."
                )
            logger.info("Using Anthropic API client")
            return AsyncAnthropic(api_key=self.claude_api_key)

    def get_sync_client(self) -> Union[Anthropic, ClaudeCLIAdapterSync]:
        """
        Get sync Anthropic client or CLI adapter

        Returns:
            Anthropic if API key provided, ClaudeCLIAdapterSync for local dev
        """
        if self.use_cli:
            logger.info("Using Claude CLI adapter (sync) for local development")
            return ClaudeCLIAdapterSync()
        else:
            if not self.claude_api_key:
                raise ValueError(
                    "CLAUDE_API_KEY environment variable required when not using CLI mode. "
                    "Set NODE_ENV=local to use CLI instead."
                )
            logger.info("Using Anthropic API client (sync)")
            return Anthropic(api_key=self.claude_api_key)


# Global config instance
config = Config()
