/**
 * Integration Test: Anthropic API → Domain Mapping
 * Tests the flow from reading a conversation prompt file through Claude API to domain model
 * Mocks the Anthropic API to avoid actual API costs during testing
 */
import * as fs from 'fs-extra';
import * as path from 'path';
import { skillClient } from '../../src/workflow/skill-client';

// Mock the fetch globally to intercept skills server calls
global.fetch = jest.fn();

describe('Anthropic API to Domain Mapping Integration', () => {
  const promptFilePath = path.join(
    __dirname,
    '../../data/claude-output/session-1763698560040-prompt.txt'
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should transform conversation from prompt file into domain model via mocked Anthropic API', async () => {
    // ===== STEP 1: Read the conversation prompt file =====
    expect(await fs.pathExists(promptFilePath)).toBe(true);
    const promptContent = await fs.readFile(promptFilePath, 'utf-8');

    // Verify we have the musician conversation
    expect(promptContent).toContain("i'm a musician playing gigs");
    expect(promptContent).toContain("1. both, 2 all what you said");
    expect(promptContent).toContain("looks good !");

    // ===== STEP 2: Extract conversation turns from prompt =====
    // Parse the conversation history
    const conversationLines = promptContent.split('\n');
    const userMessages: string[] = [];

    let currentRole = '';
    let currentMessage = '';

    for (const line of conversationLines) {
      if (line.startsWith('assistant:')) {
        if (currentRole === 'user' && currentMessage.trim()) {
          userMessages.push(currentMessage.trim());
        }
        currentRole = 'assistant';
        currentMessage = line.substring('assistant:'.length).trim();
      } else if (line.startsWith('user:')) {
        if (currentRole === 'user' && currentMessage.trim()) {
          userMessages.push(currentMessage.trim());
        }
        currentRole = 'user';
        currentMessage = line.substring('user:'.length).trim();
      } else if (line.startsWith('User:')) {
        if (currentRole === 'user' && currentMessage.trim()) {
          userMessages.push(currentMessage.trim());
        }
        currentRole = 'user';
        currentMessage = line.substring('User:'.length).trim();
      } else if (currentRole) {
        currentMessage += ' ' + line.trim();
      }
    }

    // Add last message
    if (currentRole === 'user' && currentMessage.trim()) {
      userMessages.push(currentMessage.trim());
    }

    expect(userMessages.length).toBeGreaterThan(0);
    expect(userMessages[0]).toContain("i'm a musician playing gigs");

    // ===== STEP 3: Mock Skills Server Response (which calls Anthropic internally) =====
    // The skills server would call Anthropic API, we mock the final domain model response
    const mockDomainModel = {
      entities: [
        {
          id: 'gig',
          name: 'Gig',
          pluralName: 'Gigs',
          description: 'A live music performance',
          fields: [
            {
              id: 'title',
              name: 'title',
              label: 'Title',
              type: 'text' as const,
              required: true,
            },
            {
              id: 'venue_name',
              name: 'venueName',
              label: 'Venue Name',
              type: 'text' as const,
              required: true,
            },
            {
              id: 'location',
              name: 'location',
              label: 'Location',
              type: 'text' as const,
              required: true,
            },
            {
              id: 'date_time',
              name: 'dateTime',
              label: 'Date & Time',
              type: 'datetime' as const,
              required: true,
            },
            {
              id: 'status',
              name: 'status',
              label: 'Status',
              type: 'select' as const,
              required: true,
              options: {
                choices: [
                  { value: 'upcoming', label: 'Upcoming' },
                  { value: 'past', label: 'Past' },
                ],
              },
            },
            {
              id: 'description',
              name: 'description',
              label: 'Description',
              type: 'textarea' as const,
              required: false,
            },
            {
              id: 'ticket_link',
              name: 'ticketLink',
              label: 'Ticket Link',
              type: 'url' as const,
              required: false,
            },
            {
              id: 'photos',
              name: 'photos',
              label: 'Photos',
              type: 'gallery' as const,
              required: false,
            },
            {
              id: 'videos',
              name: 'videos',
              label: 'Videos',
              type: 'files' as const,
              required: false,
            },
          ],
          displayField: 'title',
          sortable: true,
          timestamps: true,
        },
        {
          id: 'artist-profile',
          name: 'ArtistProfile',
          pluralName: 'Artist Profiles',
          description: 'Artist bio and information',
          fields: [
            {
              id: 'name',
              name: 'name',
              label: 'Name',
              type: 'text' as const,
              required: true,
            },
            {
              id: 'bio',
              name: 'bio',
              label: 'Bio',
              type: 'richtext' as const,
              required: true,
            },
            {
              id: 'profile_photo',
              name: 'profilePhoto',
              label: 'Profile Photo',
              type: 'image' as const,
              required: false,
            },
            {
              id: 'genre',
              name: 'genre',
              label: 'Genre/Style',
              type: 'text' as const,
              required: false,
            },
            {
              id: 'social_media_links',
              name: 'socialMediaLinks',
              label: 'Social Media Links',
              type: 'structure' as const,
              required: false,
            },
          ],
        },
        {
          id: 'release',
          name: 'Release',
          pluralName: 'Releases',
          description: 'Album, single, or EP',
          fields: [
            {
              id: 'title',
              name: 'title',
              label: 'Title',
              type: 'text' as const,
              required: true,
            },
            {
              id: 'release_date',
              name: 'releaseDate',
              label: 'Release Date',
              type: 'date' as const,
              required: true,
            },
            {
              id: 'cover_art',
              name: 'coverArt',
              label: 'Cover Art',
              type: 'image' as const,
              required: false,
            },
            {
              id: 'description',
              name: 'description',
              label: 'Description',
              type: 'textarea' as const,
              required: false,
            },
            {
              id: 'streaming_links',
              name: 'streamingLinks',
              label: 'Streaming Links',
              type: 'structure' as const,
              required: false,
            },
            {
              id: 'tracklist',
              name: 'tracklist',
              label: 'Tracklist',
              type: 'list' as const,
              required: false,
            },
          ],
          displayField: 'title',
          sortable: true,
          timestamps: true,
        },
        {
          id: 'audio-sample',
          name: 'AudioSample',
          pluralName: 'Audio Samples',
          description: 'Music clips and audio files',
          fields: [
            {
              id: 'title',
              name: 'title',
              label: 'Title',
              type: 'text' as const,
              required: true,
            },
            {
              id: 'audio_file',
              name: 'audioFile',
              label: 'Audio File',
              type: 'file' as const,
              required: true,
            },
            {
              id: 'duration',
              name: 'duration',
              label: 'Duration',
              type: 'text' as const,
              required: false,
            },
            {
              id: 'description',
              name: 'description',
              label: 'Description',
              type: 'textarea' as const,
              required: false,
            },
          ],
        },
        {
          id: 'band-member',
          name: 'BandMember',
          pluralName: 'Band Members',
          description: 'Band members and collaborators',
          fields: [
            {
              id: 'name',
              name: 'name',
              label: 'Name',
              type: 'text' as const,
              required: true,
            },
            {
              id: 'role',
              name: 'role',
              label: 'Role/Instrument',
              type: 'text' as const,
              required: true,
            },
            {
              id: 'photo',
              name: 'photo',
              label: 'Photo',
              type: 'image' as const,
              required: false,
            },
            {
              id: 'bio',
              name: 'bio',
              label: 'Bio',
              type: 'textarea' as const,
              required: false,
            },
          ],
        },
      ],
      relationships: [
        {
          id: 'gig-photos',
          type: 'one-to-many' as const,
          from: 'gig',
          to: 'photos',
          label: 'has photos',
        },
        {
          id: 'gig-videos',
          type: 'one-to-many' as const,
          from: 'gig',
          to: 'videos',
          label: 'has videos',
        },
        {
          id: 'release-audio-samples',
          type: 'one-to-many' as const,
          from: 'release',
          to: 'audio-sample',
          label: 'contains',
        },
        {
          id: 'artist-band-members',
          type: 'one-to-many' as const,
          from: 'artist-profile',
          to: 'band-member',
          label: 'includes',
        },
      ],
      schema: {},
    };

    // Mock the fetch call to skills server
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: {
          domainModel: mockDomainModel,
        },
        metadata: {
          duration: 2500,
          timestamp: new Date().toISOString(),
        },
      }),
    });

    // ===== STEP 4: Call Domain Mapping Skill =====
    const result = await skillClient.domainMapping({
      contentFiles: [
        {
          path: promptFilePath,
          filename: 'session-1763698560040-prompt.txt',
          mimeType: 'text/plain',
        },
      ],
    });

    // ===== STEP 5: Verify Domain Model =====
    expect(result.domainModel).toBeDefined();
    expect(result.domainModel.entities).toHaveLength(5);

    // Verify Gig entity
    const gigEntity = result.domainModel.entities.find((e) => e.id === 'gig');
    expect(gigEntity).toBeDefined();
    expect(gigEntity?.name).toBe('Gig');
    expect(gigEntity?.pluralName).toBe('Gigs');
    expect(gigEntity?.description).toContain('performance');
    expect(gigEntity?.fields).toBeDefined();

    // Verify Gig fields match conversation requirements
    const gigFields = gigEntity!.fields;
    expect(gigFields.find((f: any) => f.name === 'venueName')).toBeDefined();
    expect(gigFields.find((f: any) => f.name === 'location')).toBeDefined();
    expect(gigFields.find((f: any) => f.name === 'dateTime')).toBeDefined();
    expect(gigFields.find((f: any) => f.name === 'ticketLink')).toBeDefined();
    expect(gigFields.find((f: any) => f.name === 'photos')).toBeDefined();
    expect(gigFields.find((f: any) => f.name === 'videos')).toBeDefined();

    // Verify status field for upcoming/past
    const statusField = gigFields.find((f: any) => f.name === 'status');
    expect(statusField).toBeDefined();
    expect(statusField?.type).toBe('select');

    // Verify Artist Profile entity
    const artistEntity = result.domainModel.entities.find(
      (e: any) => e.id === 'artist-profile'
    );
    expect(artistEntity).toBeDefined();
    expect(artistEntity?.name).toBe('ArtistProfile');
    expect(artistEntity?.fields.find((f: any) => f.name === 'bio')).toBeDefined();
    expect(artistEntity?.fields.find((f: any) => f.name === 'profilePhoto')).toBeDefined();
    expect(artistEntity?.fields.find((f: any) => f.name === 'genre')).toBeDefined();

    // Verify Release entity (discography)
    const releaseEntity = result.domainModel.entities.find((e: any) => e.id === 'release');
    expect(releaseEntity).toBeDefined();
    expect(releaseEntity?.name).toBe('Release');
    expect(releaseEntity?.fields.find((f: any) => f.name === 'coverArt')).toBeDefined();
    expect(releaseEntity?.fields.find((f: any) => f.name === 'streamingLinks')).toBeDefined();
    expect(releaseEntity?.fields.find((f: any) => f.name === 'tracklist')).toBeDefined();

    // Verify Audio Sample entity
    const audioEntity = result.domainModel.entities.find((e: any) => e.id === 'audio-sample');
    expect(audioEntity).toBeDefined();
    expect(audioEntity?.name).toBe('AudioSample');
    expect(audioEntity?.fields.find((f: any) => f.name === 'audioFile')).toBeDefined();
    expect(audioEntity?.fields.find((f: any) => f.name === 'duration')).toBeDefined();

    // Verify Band Member entity
    const bandMemberEntity = result.domainModel.entities.find(
      (e: any) => e.id === 'band-member'
    );
    expect(bandMemberEntity).toBeDefined();
    expect(bandMemberEntity?.name).toBe('BandMember');
    expect(bandMemberEntity?.fields.find((f: any) => f.name === 'role')).toBeDefined();

    // Verify relationships
    expect(result.domainModel.relationships).toHaveLength(4);
    expect(
      result.domainModel.relationships.find((r: any) => r.id === 'gig-photos')
    ).toBeDefined();
    expect(
      result.domainModel.relationships.find((r: any) => r.id === 'release-audio-samples')
    ).toBeDefined();
    expect(
      result.domainModel.relationships.find((r: any) => r.id === 'artist-band-members')
    ).toBeDefined();

    console.log('✅ Domain mapping from prompt file successful!');
    console.log(`   - Parsed ${userMessages.length} conversation turns`);
    console.log(`   - Generated ${result.domainModel.entities.length} entities`);
    console.log(`   - Created ${result.domainModel.relationships.length} relationships`);
    console.log(
      '   - Entities:',
      result.domainModel.entities.map((e) => e.name).join(', ')
    );
  }, 30000); // 30 second timeout

  it('should handle conversation extraction from prompt file format', async () => {
    // Test the conversation parsing logic separately
    const promptContent = await fs.readFile(promptFilePath, 'utf-8');

    // Verify the prompt file contains the expected structure
    expect(promptContent).toContain('Previous conversation:');
    expect(promptContent).toContain('assistant:');
    expect(promptContent).toContain('user:');

    // Verify key conversation content
    expect(promptContent).toContain('Gig');
    expect(promptContent).toContain('Release');
    expect(promptContent).toContain('Band Member');
    expect(promptContent).toContain('Audio Sample');
    expect(promptContent).toContain('Artist Profile');

    console.log('✅ Prompt file format validation passed');
  });
});