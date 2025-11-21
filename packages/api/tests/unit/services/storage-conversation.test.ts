import * as fs from 'fs-extra';
import * as path from 'path';
import * as crypto from 'crypto';
import { LocalStorageService } from '../../../src/services/local/storage.service';
import { ConversationTurn, ConversationSession } from '../../../../shared/src/types/project.types';

describe('LocalStorageService - Conversation Management', () => {
  let storageService: LocalStorageService;
  let testDir: string;
  let projectId: string;

  beforeEach(async () => {
    // Create unique test directory for each test
    testDir = path.join(__dirname, '../../test-data/storage-conversation', crypto.randomUUID());
    projectId = `test-project-${crypto.randomUUID().substring(0, 8)}`;

    // Clean up and create fresh test directory
    await fs.remove(testDir);
    await fs.ensureDir(testDir);

    // Create service instance with test directory
    storageService = new LocalStorageService({ basePath: testDir, createDirectories: true });

    // Create a test project
    await storageService.createProject({
      id: projectId,
      name: 'Test Project',
      createdAt: new Date(),
      updatedAt: new Date(),
      inputs: {
        contentFiles: [],
        brandingAssets: {},
      },
      status: 'mapping',
      currentStep: 1,
      totalSteps: 5,
      errors: [],
    });
  });

  afterEach(async () => {
    // Clean up test data
    await fs.remove(testDir);
  });

  describe('saveConversationTurn', () => {
    it('should create new conversation session on first turn', async () => {
      const turn: ConversationTurn = {
        id: crypto.randomUUID(),
        timestamp: new Date(),
        role: 'user',
        content: 'Hello, I want to create a portfolio',
      };

      await storageService.saveConversationTurn(projectId, 'mapping', turn);

      const session = await storageService.getConversation(projectId, 'mapping');
      expect(session).toBeDefined();
      expect(session?.turns).toHaveLength(1);
      expect(session?.turns[0].content).toBe('Hello, I want to create a portfolio');
      expect(session?.status).toBe('active');
      expect(session?.projectId).toBe(projectId);
      expect(session?.phase).toBe('mapping');
    });

    it('should append turn to existing conversation', async () => {
      const turn1: ConversationTurn = {
        id: crypto.randomUUID(),
        timestamp: new Date(),
        role: 'user',
        content: 'First message',
      };

      const turn2: ConversationTurn = {
        id: crypto.randomUUID(),
        timestamp: new Date(),
        role: 'assistant',
        content: 'First response',
        metadata: {
          tokensUsed: 150,
          model: 'claude-opus-4',
          latencyMs: 1200,
        },
      };

      // Save first turn
      await storageService.saveConversationTurn(projectId, 'mapping', turn1);

      // Save second turn
      await storageService.saveConversationTurn(projectId, 'mapping', turn2);

      const session = await storageService.getConversation(projectId, 'mapping');
      expect(session?.turns).toHaveLength(2);
      expect(session?.turns[0].content).toBe('First message');
      expect(session?.turns[1].content).toBe('First response');
      expect(session?.turns[1].metadata?.tokensUsed).toBe(150);
    });

    it('should handle multiple phases independently', async () => {
      const mappingTurn: ConversationTurn = {
        id: crypto.randomUUID(),
        timestamp: new Date(),
        role: 'user',
        content: 'Domain mapping question',
      };

      const structuringTurn: ConversationTurn = {
        id: crypto.randomUUID(),
        timestamp: new Date(),
        role: 'user',
        content: 'Content structuring question',
      };

      await storageService.saveConversationTurn(projectId, 'mapping', mappingTurn);
      await storageService.saveConversationTurn(projectId, 'structuring', structuringTurn);

      const mappingSession = await storageService.getConversation(projectId, 'mapping');
      const structuringSession = await storageService.getConversation(projectId, 'structuring');

      expect(mappingSession?.turns).toHaveLength(1);
      expect(structuringSession?.turns).toHaveLength(1);
      expect(mappingSession?.turns[0].content).toBe('Domain mapping question');
      expect(structuringSession?.turns[0].content).toBe('Content structuring question');
    });

    it('should create conversation directory if it does not exist', async () => {
      const turn: ConversationTurn = {
        id: crypto.randomUUID(),
        timestamp: new Date(),
        role: 'user',
        content: 'Test message',
      };

      const conversationDir = path.join(testDir, projectId, 'conversations');

      // Ensure directory doesn't exist
      await fs.remove(conversationDir);
      expect(await fs.pathExists(conversationDir)).toBe(false);

      await storageService.saveConversationTurn(projectId, 'mapping', turn);

      // Directory should now exist
      expect(await fs.pathExists(conversationDir)).toBe(true);

      const conversationFile = path.join(conversationDir, 'mapping.json');
      expect(await fs.pathExists(conversationFile)).toBe(true);
    });

    it('should throw error for non-existent project', async () => {
      const turn: ConversationTurn = {
        id: crypto.randomUUID(),
        timestamp: new Date(),
        role: 'user',
        content: 'Test',
      };

      await expect(
        storageService.saveConversationTurn('non-existent-project', 'mapping', turn)
      ).rejects.toThrow();
    });
  });

  describe('getConversation', () => {
    it('should return null for non-existent conversation', async () => {
      const session = await storageService.getConversation(projectId, 'mapping');
      expect(session).toBeNull();
    });

    it('should retrieve existing conversation', async () => {
      const turns: ConversationTurn[] = [
        {
          id: crypto.randomUUID(),
          timestamp: new Date(),
          role: 'user',
          content: 'User message 1',
        },
        {
          id: crypto.randomUUID(),
          timestamp: new Date(),
          role: 'assistant',
          content: 'Assistant response 1',
        },
        {
          id: crypto.randomUUID(),
          timestamp: new Date(),
          role: 'user',
          content: 'User message 2',
        },
      ];

      // Save all turns
      for (const turn of turns) {
        await storageService.saveConversationTurn(projectId, 'mapping', turn);
      }

      const session = await storageService.getConversation(projectId, 'mapping');
      expect(session).toBeDefined();
      expect(session?.turns).toHaveLength(3);
      expect(session?.turns.map((t: ConversationTurn) => t.content)).toEqual([
        'User message 1',
        'Assistant response 1',
        'User message 2',
      ]);
    });

    it('should return null for non-existent project', async () => {
      const session = await storageService.getConversation('non-existent', 'mapping');
      expect(session).toBeNull();
    });
  });

  describe('conversation persistence', () => {
    it('should persist conversation across service restarts', async () => {
      const turn: ConversationTurn = {
        id: crypto.randomUUID(),
        timestamp: new Date(),
        role: 'user',
        content: 'Persistent message',
      };

      await storageService.saveConversationTurn(projectId, 'mapping', turn);

      // Create new service instance (simulating restart)
      const newStorageService = new LocalStorageService({ basePath: testDir });
      const session = await newStorageService.getConversation(projectId, 'mapping');

      expect(session).toBeDefined();
      expect(session?.turns).toHaveLength(1);
      expect(session?.turns[0].content).toBe('Persistent message');
    });

    it('should handle conversation with metadata correctly', async () => {
      const turn: ConversationTurn = {
        id: crypto.randomUUID(),
        timestamp: new Date(),
        role: 'assistant',
        content: 'Response with metadata',
        metadata: {
          tokensUsed: 500,
          model: 'claude-opus-4',
          latencyMs: 2500,
        },
      };

      await storageService.saveConversationTurn(projectId, 'mapping', turn);

      const session = await storageService.getConversation(projectId, 'mapping');
      expect(session?.turns[0].metadata).toEqual({
        tokensUsed: 500,
        model: 'claude-opus-4',
        latencyMs: 2500,
      });
    });
  });
});
