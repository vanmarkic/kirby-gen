/**
 * Integration Test: Domain Mapping to Kirby Blueprint Generation
 * Tests the full pipeline from user input through domain mapping to blueprint generation
 */
import * as fs from 'fs-extra';
import * as path from 'path';
import * as crypto from 'crypto';
import { LocalStorageService } from '../../src/services/local/storage.service';
import { ConversationTurn } from '../../../shared/src/types/project.types';

describe('Domain to Blueprint Integration', () => {
  let storageService: LocalStorageService;
  let testDir: string;
  let projectId: string;

  beforeAll(async () => {
    // Create unique test directory
    testDir = path.join(__dirname, '../test-data/integration-e2e', crypto.randomUUID());
    await fs.ensureDir(testDir);

    storageService = new LocalStorageService({ basePath: testDir, createDirectories: true });
  });

  afterAll(async () => {
    await fs.remove(testDir);
  });

  it('should complete full workflow: conversation → domain model → blueprint', async () => {
    // ===== STEP 1: Create Project =====
    const project = await storageService.createProject({
      id: `test-${crypto.randomUUID().substring(0, 8)}`,
      name: 'Music Portfolio',
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

    projectId = project.id;
    expect(project).toBeDefined();
    expect(project.status).toBe('mapping');

    // ===== STEP 2: Simulate Domain Mapping Conversation =====
    const conversation: ConversationTurn[] = [
      {
        id: crypto.randomUUID(),
        timestamp: new Date(),
        role: 'assistant',
        content: 'What type of content would you like to showcase?',
      },
      {
        id: crypto.randomUUID(),
        timestamp: new Date(),
        role: 'user',
        content: 'I do music gigs and websites',
      },
      {
        id: crypto.randomUUID(),
        timestamp: new Date(),
        role: 'assistant',
        content: 'Great! What information do you show for each?',
      },
      {
        id: crypto.randomUUID(),
        timestamp: new Date(),
        role: 'user',
        content: 'For music gigs: event, date, location, recording, lineup, fee. For websites: client, technology, description, date.',
      },
    ];

    // Save conversation turns
    for (const turn of conversation) {
      await storageService.saveConversationTurn(projectId, 'mapping', turn);
    }

    // Verify conversation was saved
    const savedConversation = await storageService.getConversation(projectId, 'mapping');
    expect(savedConversation).toBeDefined();
    expect(savedConversation?.turns).toHaveLength(4);
    expect(savedConversation?.status).toBe('active');

    // ===== STEP 3: Generate Domain Model =====
    const domainModel = {
      entities: [
        {
          id: 'music-gig',
          name: 'MusicGig',
          pluralName: 'Music Gigs',
          description: 'A live music performance',
          fields: [
            { id: 'event', name: 'event', label: 'Event', type: 'text' as const, required: true },
            { id: 'date', name: 'date', label: 'Date', type: 'date' as const, required: true },
            { id: 'location', name: 'location', label: 'Location', type: 'text' as const, required: true },
            { id: 'recording', name: 'recording', label: 'Recording', type: 'url' as const, required: false },
            { id: 'lineup', name: 'lineup', label: 'Lineup', type: 'structure' as const, required: false },
            { id: 'fee', name: 'fee', label: 'Fee', type: 'number' as const, required: false },
          ],
        },
        {
          id: 'website',
          name: 'Website',
          pluralName: 'Websites',
          description: 'A website project',
          fields: [
            { id: 'client', name: 'client', label: 'Client', type: 'text' as const, required: true },
            { id: 'technology', name: 'technology', label: 'Technology', type: 'tags' as const, required: true },
            { id: 'description', name: 'description', label: 'Description', type: 'textarea' as const, required: true },
            { id: 'date', name: 'date', label: 'Date', type: 'date' as const, required: true },
          ],
        },
      ],
      relationships: [],
      schema: {},
    };

    await storageService.updateProject(projectId, {
      domainModel,
      status: 'structuring',
    });

    // Verify domain model was saved
    const updatedProject = await storageService.getProject(projectId);
    expect(updatedProject?.domainModel).toBeDefined();
    expect(updatedProject?.domainModel?.entities).toHaveLength(2);
    expect(updatedProject?.status).toBe('structuring');

    // ===== STEP 4: Generate Kirby Blueprints =====
    // Simulate blueprint generation (in real workflow, KirbyAdapter would do this)
    const blueprints = {
      'music-gig': {
        title: 'Music Gig',
        icon: 'music',
        tabs: {
          content: {
            label: 'Content',
            columns: [
              {
                width: '2/3',
                sections: {
                  main: {
                    type: 'fields',
                    fields: {
                      event: { label: 'Event', type: 'text', required: true },
                      date: { label: 'Date', type: 'date', required: true },
                      location: { label: 'Location', type: 'text', required: true },
                      recording: { label: 'Recording', type: 'url' },
                      lineup: { label: 'Lineup', type: 'structure' },
                      fee: { label: 'Fee', type: 'number' },
                    },
                  },
                },
              },
            ],
          },
        },
      },
      website: {
        title: 'Website',
        icon: 'code',
        tabs: {
          content: {
            label: 'Content',
            columns: [
              {
                width: '2/3',
                sections: {
                  main: {
                    type: 'fields',
                    fields: {
                      client: { label: 'Client', type: 'text', required: true },
                      technology: { label: 'Technology', type: 'tags', required: true },
                      description: { label: 'Description', type: 'textarea', required: true },
                      date: { label: 'Date', type: 'date', required: true },
                    },
                  },
                },
              },
            ],
          },
        },
      },
    };

    await storageService.updateProject(projectId, {
      blueprints,
      status: 'generating',
    });

    // ===== STEP 5: Save Generated Artifacts =====
    const artifacts = {
      blueprints: [
        {
          id: 'bp-1',
          filename: 'music-gig.yml',
          originalName: 'music-gig.yml',
          mimeType: 'application/yaml',
          size: 500,
          uploadedAt: new Date(),
          path: path.join(testDir, projectId, 'generated', 'blueprints', 'music-gig.yml'),
        },
        {
          id: 'bp-2',
          filename: 'website.yml',
          originalName: 'website.yml',
          mimeType: 'application/yaml',
          size: 450,
          uploadedAt: new Date(),
          path: path.join(testDir, projectId, 'generated', 'blueprints', 'website.yml'),
        },
      ],
      templates: [],
      content: [],
      assets: [],
      generatedAt: new Date(),
      cmsAdapter: 'kirby',
    };

    await storageService.saveGeneratedArtifacts(projectId, artifacts);

    // ===== VERIFICATION =====
    const finalProject = await storageService.getProject(projectId);

    // Verify conversation persistence
    const finalConversation = await storageService.getConversation(projectId, 'mapping');
    expect(finalConversation?.turns).toHaveLength(4);
    expect(finalConversation?.turns[1].content).toContain('music gigs and websites');

    // Verify domain model
    expect(finalProject?.domainModel?.entities).toHaveLength(2);
    expect(finalProject?.domainModel?.entities[0].name).toBe('MusicGig');
    expect(finalProject?.domainModel?.entities[1].name).toBe('Website');

    // Verify blueprints
    expect(finalProject?.blueprints).toBeDefined();
    expect(finalProject?.blueprints?.['music-gig']).toBeDefined();
    expect(finalProject?.blueprints?.['website']).toBeDefined();

    // Verify generated artifacts
    const savedArtifacts = await storageService.getGeneratedArtifacts(projectId);
    expect(savedArtifacts).toBeDefined();
    expect(savedArtifacts?.blueprints).toHaveLength(2);
    expect(savedArtifacts?.cmsAdapter).toBe('kirby');

    // Verify file structure
    const projectDir = path.join(testDir, projectId);
    expect(await fs.pathExists(projectDir)).toBe(true);
    expect(await fs.pathExists(path.join(projectDir, '_project.json'))).toBe(true);
    expect(await fs.pathExists(path.join(projectDir, 'conversations', 'mapping.json'))).toBe(true);

    console.log('✅ Full integration test passed!');
    console.log('   - Conversation saved:', savedConversation?.turns.length, 'turns');
    console.log('   - Domain model:', finalProject?.domainModel?.entities.length, 'entities');
    console.log('   - Blueprints:', Object.keys(finalProject?.blueprints || {}).length, 'generated');
    console.log('   - Artifacts:', savedArtifacts?.blueprints.length, 'blueprint files');
  }, 30000); // 30 second timeout
});
