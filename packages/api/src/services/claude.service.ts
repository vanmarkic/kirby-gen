/**
 * Claude AI Service
 * Handles conversations with Claude for domain mapping
 */
import Anthropic from '@anthropic-ai/sdk';
import { exec } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';
import { env } from '../config/env';
import { logger } from '../config/logger';
import type { Message } from '@kirby-gen/shared';

export class ClaudeService {
  private client: Anthropic | null = null;
  private readonly useCLI: boolean;
  private readonly systemPrompt = `You are an expert in domain modeling and content structure analysis. Your role is to help users discover and define the entities (content types) in their portfolio.

Your task is to:
1. Understand what type of content the user wants to showcase (projects, articles, case studies, etc.)
2. Identify the key entities and their fields
3. Build a clear domain model with entities and relationships
4. Be concise and conversational
5. Ask clarifying questions when needed

When you've gathered enough information, provide a structured schema with entities, their fields, and relationships.`;

  constructor() {
    this.useCLI = env.CLAUDE_USE_CLI;

    if (this.useCLI) {
      logger.info('Claude CLI mode enabled for local development');
      // Ensure output directory exists
      fs.mkdir(env.CLAUDE_CLI_OUTPUT_DIR, { recursive: true }).catch((err) => {
        logger.error('Failed to create Claude CLI output directory:', err);
      });
    } else if (env.ANTHROPIC_API_KEY) {
      this.client = new Anthropic({
        apiKey: env.ANTHROPIC_API_KEY,
      });
      logger.info('Claude AI service initialized with API');
    } else {
      logger.warn('Claude AI not configured (no API key or CLI mode)');
    }
  }

  /**
   * Check if Claude is available
   */
  isAvailable(): boolean {
    return this.useCLI || this.client !== null;
  }

  /**
   * Send a message and get a response from Claude
   */
  async sendMessage(
    userMessage: string,
    conversationHistory: Message[] = []
  ): Promise<{
    message: string;
    schema: any | null;
    isComplete: boolean;
  }> {
    if (this.useCLI) {
      return this.sendMessageViaCLI(userMessage, conversationHistory);
    } else if (this.client) {
      return this.sendMessageViaAPI(userMessage, conversationHistory);
    } else {
      throw new Error('Claude AI is not configured');
    }
  }

  /**
   * Send message via Anthropic API
   */
  private async sendMessageViaAPI(
    userMessage: string,
    conversationHistory: Message[] = []
  ): Promise<{
    message: string;
    schema: any | null;
    isComplete: boolean;
  }> {
    if (!this.client) {
      throw new Error('Claude AI is not configured. Please set ANTHROPIC_API_KEY in your environment.');
    }

    try {
      // Build conversation history for Claude
      const messages: Anthropic.MessageParam[] = [
        ...conversationHistory.map((msg) => ({
          role: msg.role === 'assistant' ? ('assistant' as const) : ('user' as const),
          content: msg.content,
        })),
        {
          role: 'user' as const,
          content: userMessage,
        },
      ];

      // Call Claude API
      const response = await this.client.messages.create({
        model: env.CLAUDE_MODEL,
        max_tokens: 2048,
        system: this.systemPrompt,
        messages,
      });

      const assistantMessage = response.content[0].type === 'text'
        ? response.content[0].text
        : '';

      // Check if Claude indicated completion
      const isComplete = assistantMessage.toLowerCase().includes('ready to proceed') ||
                         assistantMessage.toLowerCase().includes('domain model complete') ||
                         response.stop_reason === 'end_turn';

      return {
        message: assistantMessage,
        schema: null, // TODO: Parse schema from Claude's response
        isComplete,
      };
    } catch (error) {
      logger.error('Claude API error:', error);
      throw new Error('Failed to communicate with Claude AI');
    }
  }

  /**
   * Send message via Claude CLI (for local development)
   */
  private async sendMessageViaCLI(
    userMessage: string,
    conversationHistory: Message[] = []
  ): Promise<{
    message: string;
    schema: any | null;
    isComplete: boolean;
  }> {
    try {
      const timestamp = Date.now();
      const sessionId = `session-${timestamp}`;

      // Create output directory
      const outputDir = path.resolve(env.CLAUDE_CLI_OUTPUT_DIR);
      await fs.mkdir(outputDir, { recursive: true });

      // Prepare prompt file
      const promptFile = path.join(outputDir, `${sessionId}-prompt.txt`);
      const outputFile = path.join(outputDir, `${sessionId}-output.txt`);
      const finishedHook = path.join(outputDir, `${sessionId}-finished.hook`);

      // Build full prompt with context
      const fullPrompt = this.buildCLIPrompt(userMessage, conversationHistory);
      await fs.writeFile(promptFile, fullPrompt, 'utf-8');

      // Execute Claude CLI script
      const scriptPath = path.resolve(env.CLAUDE_CLI_SCRIPT);
      const command = `bash "${scriptPath}" "${promptFile}" "${outputFile}" "${finishedHook}"`;

      logger.info(`Executing Claude CLI: ${command}`);

      await new Promise<void>((resolve, reject) => {
        exec(command, { timeout: 60000 }, (error, stdout, stderr) => {
          if (error) {
            logger.error('Claude CLI error:', error);
            logger.error('stderr:', stderr);
            reject(error);
            return;
          }
          logger.debug('Claude CLI stdout:', stdout);
          resolve();
        });
      });

      // Wait for finished hook (with timeout)
      await this.waitForHook(finishedHook, 60000);

      // Read response
      const response = await fs.readFile(outputFile, 'utf-8');

      // Cleanup files
      await Promise.all([
        fs.unlink(promptFile).catch(() => {}),
        fs.unlink(outputFile).catch(() => {}),
        fs.unlink(finishedHook).catch(() => {}),
      ]);

      return {
        message: response.trim(),
        schema: null,
        isComplete: true, // CLI mode assumes completion after each message
      };
    } catch (error) {
      logger.error('Claude CLI error:', error);
      throw new Error('Failed to communicate with Claude CLI');
    }
  }

  /**
   * Build prompt for CLI with context
   */
  private buildCLIPrompt(userMessage: string, conversationHistory: Message[]): string {
    let prompt = `${this.systemPrompt}\n\n`;

    if (conversationHistory.length > 0) {
      prompt += 'Previous conversation:\n';
      for (const msg of conversationHistory) {
        prompt += `${msg.role}: ${msg.content}\n`;
      }
      prompt += '\n';
    }

    prompt += `User: ${userMessage}\n\nAssistant:`;
    return prompt;
  }

  /**
   * Wait for finished hook file to be created
   */
  private async waitForHook(hookPath: string, timeout: number): Promise<void> {
    const startTime = Date.now();
    while (Date.now() - startTime < timeout) {
      try {
        await fs.access(hookPath);
        return; // Hook file exists
      } catch {
        // Wait 100ms and try again
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    }
    throw new Error('Timeout waiting for Claude CLI to finish');
  }

  /**
   * Get initial greeting message
   */
  getInitialMessage(): string {
    if (!this.isAvailable()) {
      return "Hello! I'm here to help you discover the entities in your portfolio. Note: Claude AI is not configured, so I'm running in limited mode. What type of work would you like to showcase?";
    }

    const mode = this.useCLI ? ' (powered by Claude CLI)' : '';
    return `Hello! I'll help you discover the entities in your portfolio${mode}. Based on your uploaded content, what type of work would you like to showcase? For example: projects, articles, case studies, photography, designs, etc.`;
  }
}

// Singleton instance
export const claudeService = new ClaudeService();
