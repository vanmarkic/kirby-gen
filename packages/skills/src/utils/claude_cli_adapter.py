"""
Claude CLI Adapter
Wraps the Claude CLI for local development to avoid API usage costs
"""

import subprocess
import json
import asyncio
import os
from typing import AsyncGenerator, Optional, Dict, Any, List
import logging

logger = logging.getLogger(__name__)


class ClaudeMessage:
    """Message structure compatible with Anthropic SDK"""

    def __init__(self, content: List[Dict[str, Any]]):
        self.content = content


class ClaudeStreamDelta:
    """Stream delta compatible with Anthropic SDK"""

    def __init__(self, text: str):
        self.text = text


class ClaudeStreamEvent:
    """Stream event compatible with Anthropic SDK"""

    def __init__(self, event_type: str, delta: Optional[ClaudeStreamDelta] = None):
        self.type = event_type
        self.delta = delta


class ClaudeCLIAdapter:
    """
    Adapter that uses Claude CLI instead of Anthropic API
    Provides same interface as AsyncAnthropic for compatibility
    """

    def __init__(self, api_key: Optional[str] = None):
        """
        Initialize CLI adapter

        Args:
            api_key: Ignored for CLI (kept for compatibility)
        """
        self.api_key = api_key
        self.messages = MessageClient(self)


class MessageClient:
    """Messages client compatible with Anthropic SDK"""

    def __init__(self, parent: ClaudeCLIAdapter):
        self.parent = parent

    async def create(
        self,
        model: str,
        max_tokens: int,
        temperature: float,
        system: str,
        messages: List[Dict[str, str]],
        stream: bool = False,
    ):
        """
        Create a message using Claude CLI

        Args:
            model: Model identifier (used for reference only)
            max_tokens: Max tokens to generate
            temperature: Temperature for generation
            system: System prompt
            messages: Conversation history
            stream: Whether to stream responses

        Returns:
            ClaudeMessage or AsyncGenerator for streaming
        """
        # Build the prompt from messages
        prompt_parts = [f"System: {system}\n"]

        for msg in messages:
            role = msg["role"].capitalize()
            content = msg["content"]
            prompt_parts.append(f"{role}: {content}\n")

        prompt = "\n".join(prompt_parts)

        # Write prompt to temp file to avoid shell escaping issues
        import tempfile
        with tempfile.NamedTemporaryFile(mode='w', delete=False, suffix='.txt') as f:
            f.write(prompt)
            prompt_file = f.name

        try:
            if stream:
                return self._stream_response(prompt_file, max_tokens)
            else:
                return await self._get_response(prompt_file, max_tokens)
        finally:
            # Clean up temp file
            try:
                os.unlink(prompt_file)
            except:
                pass

    async def _get_response(self, prompt_file: str, max_tokens: int) -> ClaudeMessage:
        """Get non-streaming response from Claude CLI"""
        try:
            # Call claude CLI
            cmd = [
                "claude",
                "--file", prompt_file,
                "--output", "text",
            ]

            logger.debug(f"Calling Claude CLI: {' '.join(cmd)}")

            # Run async subprocess
            process = await asyncio.create_subprocess_exec(
                *cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )

            stdout, stderr = await process.communicate()

            if process.returncode != 0:
                error_msg = stderr.decode('utf-8') if stderr else "Unknown error"
                raise Exception(f"Claude CLI failed: {error_msg}")

            response_text = stdout.decode('utf-8').strip()

            return ClaudeMessage(content=[{"type": "text", "text": response_text}])

        except FileNotFoundError:
            raise Exception(
                "Claude CLI not found. Please install it first:\n"
                "npm install -g @anthropic-ai/claude-code"
            )
        except Exception as e:
            logger.error(f"Error calling Claude CLI: {str(e)}")
            raise

    async def _stream_response(
        self,
        prompt_file: str,
        max_tokens: int
    ) -> AsyncGenerator[ClaudeStreamEvent, None]:
        """Stream response from Claude CLI"""
        try:
            # Call claude CLI (CLI doesn't support native streaming, so we'll simulate it)
            cmd = [
                "claude",
                "--file", prompt_file,
                "--output", "text",
            ]

            logger.debug(f"Calling Claude CLI (simulated streaming): {' '.join(cmd)}")

            # Run async subprocess
            process = await asyncio.create_subprocess_exec(
                *cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )

            stdout, stderr = await process.communicate()

            if process.returncode != 0:
                error_msg = stderr.decode('utf-8') if stderr else "Unknown error"
                raise Exception(f"Claude CLI failed: {error_msg}")

            response_text = stdout.decode('utf-8').strip()

            # Simulate streaming by yielding chunks
            chunk_size = 50  # Characters per chunk
            for i in range(0, len(response_text), chunk_size):
                chunk = response_text[i:i + chunk_size]
                yield ClaudeStreamEvent(
                    event_type="content_block_delta",
                    delta=ClaudeStreamDelta(text=chunk)
                )
                # Small delay to simulate streaming
                await asyncio.sleep(0.01)

            # Final event
            yield ClaudeStreamEvent(event_type="message_stop")

        except FileNotFoundError:
            raise Exception(
                "Claude CLI not found. Please install it first:\n"
                "npm install -g @anthropic-ai/claude-code"
            )
        except Exception as e:
            logger.error(f"Error calling Claude CLI: {str(e)}")
            raise


# For sync client compatibility
class ClaudeCLIAdapterSync:
    """Synchronous version of CLI adapter (not recommended)"""

    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key
        self.messages = MessageClientSync(self)


class MessageClientSync:
    """Sync messages client"""

    def __init__(self, parent: ClaudeCLIAdapterSync):
        self.parent = parent

    def create(
        self,
        model: str,
        max_tokens: int,
        temperature: float,
        system: str,
        messages: List[Dict[str, str]],
    ) -> ClaudeMessage:
        """Sync version - uses asyncio.run internally"""
        adapter = ClaudeCLIAdapter()
        loop = asyncio.new_event_loop()
        try:
            return loop.run_until_complete(
                adapter.messages.create(
                    model=model,
                    max_tokens=max_tokens,
                    temperature=temperature,
                    system=system,
                    messages=messages,
                    stream=False
                )
            )
        finally:
            loop.close()
