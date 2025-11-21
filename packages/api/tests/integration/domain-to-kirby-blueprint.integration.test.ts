/**
 * Integration Test: Domain Model → Kirby Blueprint Generation
 * Tests the transformation from generic domain model to Kirby-specific blueprints
 * Uses the musician portfolio domain model from the conversation
 */
import * as fs from 'fs-extra';
import * as path from 'path';
import * as crypto from 'crypto';
import { parse as parseYaml } from 'yaml';
import { BlueprintGenerator } from '../../../kirby-generator/src/adapters/kirby/blueprint-generator';
import { EntitySchema, GenericFieldType } from '@kirby-gen/shared';

describe('Domain Model to Kirby Blueprint Integration', () => {
  let blueprintGenerator: BlueprintGenerator;
  let testOutputDir: string;

  beforeAll(() => {
    blueprintGenerator = new BlueprintGenerator({
      enableDrafts: true,
      enablePreview: true,
      useTabLayout: true,
    });

    // Create test output directory
    testOutputDir = path.join(__dirname, '../test-data/blueprint-output', crypto.randomUUID());
  });

  afterAll(async () => {
    // Clean up test output
    if (await fs.pathExists(testOutputDir)) {
      await fs.remove(testOutputDir);
    }
  });

  it('should generate Kirby blueprint for Gig entity with all required fields', async () => {
    // ===== STEP 1: Define Gig Entity from Domain Model =====
    const gigEntity: EntitySchema = {
      id: 'gig',
      name: 'Gig',
      pluralName: 'Gigs',
      description: 'A live music performance',
      displayField: 'title',
      icon: 'music',
      sortable: true,
      timestamps: true,
      fields: [
        {
          id: 'title',
          name: 'title',
          label: 'Title',
          type: 'text' as GenericFieldType,
          required: true,
          helpText: 'Event title (e.g., "Live at Blue Note Jazz Club")',
        },
        {
          id: 'venue_name',
          name: 'venueName',
          label: 'Venue Name',
          type: 'text' as GenericFieldType,
          required: true,
        },
        {
          id: 'location',
          name: 'location',
          label: 'Location',
          type: 'text' as GenericFieldType,
          required: true,
          helpText: 'City or full address',
        },
        {
          id: 'date_time',
          name: 'dateTime',
          label: 'Date & Time',
          type: 'datetime' as GenericFieldType,
          required: true,
        },
        {
          id: 'status',
          name: 'status',
          label: 'Status',
          type: 'select' as GenericFieldType,
          required: true,
          options: {
            choices: [
              { value: 'upcoming', label: 'Upcoming' },
              { value: 'past', label: 'Past' },
            ],
            defaultValue: 'upcoming',
          },
        },
        {
          id: 'description',
          name: 'description',
          label: 'Description',
          type: 'textarea' as GenericFieldType,
          required: false,
        },
        {
          id: 'ticket_link',
          name: 'ticketLink',
          label: 'Ticket Link',
          type: 'url' as GenericFieldType,
          required: false,
          helpText: 'Link to ticket purchase page',
        },
        {
          id: 'photos',
          name: 'photos',
          label: 'Photos',
          type: 'gallery' as GenericFieldType,
          required: false,
        },
        {
          id: 'videos',
          name: 'videos',
          label: 'Videos',
          type: 'files' as GenericFieldType,
          required: false,
          options: {
            accept: ['video/mp4', 'video/webm'],
          },
        },
      ],
    };

    // ===== STEP 2: Generate Kirby Blueprint =====
    const blueprintYaml = blueprintGenerator.generateBlueprint(gigEntity);

    // ===== STEP 3: Parse and Verify Blueprint Structure =====
    expect(blueprintYaml).toBeTruthy();

    const blueprint = parseYaml(blueprintYaml);

    // Verify basic structure
    expect(blueprint.title).toBe('Gig');
    expect(blueprint.icon).toBe('music');
    expect(blueprint.num).toBe('num'); // sortable = true

    // Verify status options (drafts enabled)
    expect(blueprint.status).toBeDefined();
    expect(blueprint.status.draft).toBeDefined();
    expect(blueprint.status.listed).toBeDefined();

    // Verify options
    expect(blueprint.options).toBeDefined();
    expect(blueprint.options.preview).toBe(true);
    expect(blueprint.options.delete).toBe(true);

    // Verify tabs layout (9 fields > 6, so should use tabs)
    expect(blueprint.tabs).toBeDefined();
    expect(blueprint.tabs.content).toBeDefined();
    expect(blueprint.tabs.media).toBeDefined();

    // Verify content tab has text fields
    const contentTab = blueprint.tabs.content;
    expect(contentTab.label).toBe('Content');
    expect(contentTab.columns).toBeDefined();

    // Extract fields from content tab
    const contentFields = contentTab.columns[0].sections.main.fields;
    expect(contentFields.title).toBeDefined();
    expect(contentFields.title.type).toBe('text');
    expect(contentFields.title.required).toBe(true);

    expect(contentFields.venueName).toBeDefined();
    expect(contentFields.location).toBeDefined();
    expect(contentFields.dateTime).toBeDefined();
    expect(contentFields.status).toBeDefined();
    expect(contentFields.description).toBeDefined();
    expect(contentFields.ticketLink).toBeDefined();

    // Verify status field has select options
    expect(contentFields.status.type).toBe('select');
    expect(contentFields.status.options).toBeDefined();

    // Verify media tab has media fields
    const mediaTab = blueprint.tabs.media;
    expect(mediaTab.label).toBe('Media');

    const mediaFields = mediaTab.columns[0].sections.main.fields;
    expect(mediaFields.photos).toBeDefined();
    expect(mediaFields.videos).toBeDefined();

    // ===== STEP 4: Save and Verify Blueprint File =====
    await fs.ensureDir(testOutputDir);
    const blueprintPath = path.join(testOutputDir, 'gig.yml');
    await fs.writeFile(blueprintPath, blueprintYaml, 'utf-8');

    expect(await fs.pathExists(blueprintPath)).toBe(true);

    // Verify filename generation
    const filename = blueprintGenerator.getBlueprintFilename(gigEntity);
    expect(filename).toBe('gig.yml');

    console.log('✅ Gig blueprint generated successfully!');
    console.log(`   - Blueprint file: ${blueprintPath}`);
    console.log(`   - Tabs: ${Object.keys(blueprint.tabs).join(', ')}`);
    console.log(`   - Total fields: ${gigEntity.fields.length}`);
  });

  it('should generate blueprints for all musician portfolio entities', async () => {
    // ===== Define All Entities from Domain Model =====
    const entities: EntitySchema[] = [
      // Artist Profile
      {
        id: 'artist-profile',
        name: 'ArtistProfile',
        pluralName: 'Artist Profiles',
        description: 'Artist bio and information',
        icon: 'user',
        fields: [
          {
            id: 'name',
            name: 'name',
            label: 'Name',
            type: 'text' as GenericFieldType,
            required: true,
          },
          {
            id: 'bio',
            name: 'bio',
            label: 'Bio',
            type: 'richtext' as GenericFieldType,
            required: true,
          },
          {
            id: 'profile_photo',
            name: 'profilePhoto',
            label: 'Profile Photo',
            type: 'image' as GenericFieldType,
            required: false,
          },
          {
            id: 'genre',
            name: 'genre',
            label: 'Genre/Style',
            type: 'text' as GenericFieldType,
            required: false,
          },
        ],
      },

      // Release
      {
        id: 'release',
        name: 'Release',
        pluralName: 'Releases',
        description: 'Album, single, or EP',
        icon: 'disc',
        displayField: 'title',
        sortable: true,
        timestamps: true,
        fields: [
          {
            id: 'title',
            name: 'title',
            label: 'Title',
            type: 'text' as GenericFieldType,
            required: true,
          },
          {
            id: 'release_date',
            name: 'releaseDate',
            label: 'Release Date',
            type: 'date' as GenericFieldType,
            required: true,
          },
          {
            id: 'cover_art',
            name: 'coverArt',
            label: 'Cover Art',
            type: 'image' as GenericFieldType,
            required: false,
          },
          {
            id: 'description',
            name: 'description',
            label: 'Description',
            type: 'textarea' as GenericFieldType,
            required: false,
          },
          {
            id: 'tracklist',
            name: 'tracklist',
            label: 'Tracklist',
            type: 'list' as GenericFieldType,
            required: false,
          },
        ],
      },

      // Audio Sample
      {
        id: 'audio-sample',
        name: 'AudioSample',
        pluralName: 'Audio Samples',
        description: 'Music clips and audio files',
        icon: 'audio',
        fields: [
          {
            id: 'title',
            name: 'title',
            label: 'Title',
            type: 'text' as GenericFieldType,
            required: true,
          },
          {
            id: 'audio_file',
            name: 'audioFile',
            label: 'Audio File',
            type: 'file' as GenericFieldType,
            required: true,
            options: {
              accept: ['audio/mp3', 'audio/wav', 'audio/ogg'],
            },
          },
          {
            id: 'duration',
            name: 'duration',
            label: 'Duration',
            type: 'text' as GenericFieldType,
            required: false,
          },
        ],
      },

      // Band Member
      {
        id: 'band-member',
        name: 'BandMember',
        pluralName: 'Band Members',
        description: 'Band members and collaborators',
        icon: 'users',
        fields: [
          {
            id: 'name',
            name: 'name',
            label: 'Name',
            type: 'text' as GenericFieldType,
            required: true,
          },
          {
            id: 'role',
            name: 'role',
            label: 'Role/Instrument',
            type: 'text' as GenericFieldType,
            required: true,
          },
          {
            id: 'photo',
            name: 'photo',
            label: 'Photo',
            type: 'image' as GenericFieldType,
            required: false,
          },
          {
            id: 'bio',
            name: 'bio',
            label: 'Bio',
            type: 'textarea' as GenericFieldType,
            required: false,
          },
        ],
      },
    ];

    // ===== Generate Blueprints for All Entities =====
    await fs.ensureDir(testOutputDir);

    const generatedBlueprints: Array<{ entity: string; path: string; yaml: string }> = [];

    for (const entity of entities) {
      const yaml = blueprintGenerator.generateBlueprint(entity);
      const filename = blueprintGenerator.getBlueprintFilename(entity);
      const blueprintPath = path.join(testOutputDir, filename);

      await fs.writeFile(blueprintPath, yaml, 'utf-8');
      expect(await fs.pathExists(blueprintPath)).toBe(true);

      generatedBlueprints.push({
        entity: entity.name,
        path: blueprintPath,
        yaml,
      });
    }

    // ===== Verify All Blueprints =====
    expect(generatedBlueprints).toHaveLength(4);

    // Verify Artist Profile blueprint
    const artistBlueprint = parseYaml(
      generatedBlueprints.find((b) => b.entity === 'ArtistProfile')!.yaml
    );
    expect(artistBlueprint.title).toBe('ArtistProfile');
    expect(artistBlueprint.icon).toBe('user');

    // Verify Release blueprint
    const releaseBlueprint = parseYaml(
      generatedBlueprints.find((b) => b.entity === 'Release')!.yaml
    );
    expect(releaseBlueprint.title).toBe('Release');
    expect(releaseBlueprint.icon).toBe('disc');
    expect(releaseBlueprint.num).toBe('num'); // sortable

    // Verify Audio Sample blueprint
    const audioBlueprint = parseYaml(
      generatedBlueprints.find((b) => b.entity === 'AudioSample')!.yaml
    );
    expect(audioBlueprint.title).toBe('AudioSample');
    expect(audioBlueprint.icon).toBe('audio');

    // Verify Band Member blueprint
    const bandBlueprint = parseYaml(
      generatedBlueprints.find((b) => b.entity === 'BandMember')!.yaml
    );
    expect(bandBlueprint.title).toBe('BandMember');
    expect(bandBlueprint.icon).toBe('users');

    console.log('✅ All musician portfolio blueprints generated successfully!');
    console.log(`   - Total entities: ${entities.length}`);
    console.log(`   - Generated blueprints: ${generatedBlueprints.length}`);
    console.log('   - Entities:', entities.map((e) => e.name).join(', '));
  });

  it('should generate site blueprint with all entity templates', async () => {
    // ===== Define entities for site blueprint =====
    const entities: EntitySchema[] = [
      {
        id: 'gig',
        name: 'Gig',
        pluralName: 'Gigs',
        fields: [],
      },
      {
        id: 'release',
        name: 'Release',
        pluralName: 'Releases',
        fields: [],
      },
      {
        id: 'audio-sample',
        name: 'AudioSample',
        pluralName: 'Audio Samples',
        fields: [],
      },
      {
        id: 'band-member',
        name: 'BandMember',
        pluralName: 'Band Members',
        fields: [],
      },
    ];

    // ===== Generate Site Blueprint =====
    const siteYaml = blueprintGenerator.generateSiteBlueprint(entities);
    expect(siteYaml).toBeTruthy();

    const siteBlueprint = parseYaml(siteYaml);

    // Verify site blueprint structure
    expect(siteBlueprint.title).toBe('Site');
    expect(siteBlueprint.icon).toBe('home');
    expect(siteBlueprint.tabs).toBeDefined();
    expect(siteBlueprint.tabs.pages).toBeDefined();
    expect(siteBlueprint.tabs.files).toBeDefined();

    // Verify pages section includes all templates
    const pagesSection = siteBlueprint.tabs.pages.columns[0].sections.pages;
    expect(pagesSection.type).toBe('pages');
    expect(pagesSection.template).toHaveLength(4);
    expect(pagesSection.template).toContain('gig');
    expect(pagesSection.template).toContain('release');
    expect(pagesSection.template).toContain('audio-sample');
    expect(pagesSection.template).toContain('band-member');

    // Save site blueprint
    await fs.ensureDir(testOutputDir);
    const siteBlueprintPath = path.join(testOutputDir, 'site.yml');
    await fs.writeFile(siteBlueprintPath, siteYaml, 'utf-8');

    expect(await fs.pathExists(siteBlueprintPath)).toBe(true);

    console.log('✅ Site blueprint generated successfully!');
    console.log(`   - Blueprint file: ${siteBlueprintPath}`);
    console.log(`   - Templates included: ${pagesSection.template.join(', ')}`);
  });

  it('should correctly map generic field types to Kirby field types', async () => {
    // ===== Test Entity with Various Field Types =====
    const testEntity: EntitySchema = {
      id: 'test-fields',
      name: 'TestFields',
      pluralName: 'Test Fields',
      fields: [
        { id: 'f1', name: 'text', label: 'Text', type: 'text' as GenericFieldType, required: true },
        { id: 'f2', name: 'textarea', label: 'Textarea', type: 'textarea' as GenericFieldType, required: false },
        { id: 'f3', name: 'richtext', label: 'Rich Text', type: 'richtext' as GenericFieldType, required: false },
        { id: 'f4', name: 'markdown', label: 'Markdown', type: 'markdown' as GenericFieldType, required: false },
        { id: 'f5', name: 'number', label: 'Number', type: 'number' as GenericFieldType, required: false },
        { id: 'f6', name: 'date', label: 'Date', type: 'date' as GenericFieldType, required: false },
        { id: 'f7', name: 'datetime', label: 'Datetime', type: 'datetime' as GenericFieldType, required: false },
        { id: 'f8', name: 'image', label: 'Image', type: 'image' as GenericFieldType, required: false },
        { id: 'f9', name: 'file', label: 'File', type: 'file' as GenericFieldType, required: false },
        { id: 'f10', name: 'gallery', label: 'Gallery', type: 'gallery' as GenericFieldType, required: false },
        { id: 'f11', name: 'url', label: 'URL', type: 'url' as GenericFieldType, required: false },
        { id: 'f12', name: 'email', label: 'Email', type: 'email' as GenericFieldType, required: false },
        { id: 'f13', name: 'select', label: 'Select', type: 'select' as GenericFieldType, required: false },
        { id: 'f14', name: 'tags', label: 'Tags', type: 'tags' as GenericFieldType, required: false },
        { id: 'f15', name: 'boolean', label: 'Boolean', type: 'boolean' as GenericFieldType, required: false },
      ],
    };

    // Generate blueprint
    const yaml = blueprintGenerator.generateBlueprint(testEntity);
    const blueprint = parseYaml(yaml);

    // Extract all fields from blueprint (handling both tab and column layouts)
    const allFields: Record<string, any> = {};

    if (blueprint.tabs) {
      // Tabs layout - collect fields from all tabs
      Object.values(blueprint.tabs).forEach((tab: any) => {
        if (tab.fields) {
          Object.assign(allFields, tab.fields);
        }
        if (tab.columns) {
          tab.columns.forEach((column: any) => {
            Object.values(column.sections).forEach((section: any) => {
              if (section.fields) {
                Object.assign(allFields, section.fields);
              }
            });
          });
        }
      });
    } else if (blueprint.columns) {
      // Column layout - collect from sections
      blueprint.columns.forEach((column: any) => {
        Object.values(column.sections).forEach((section: any) => {
          if (section.fields) {
            Object.assign(allFields, section.fields);
          }
        });
      });
    }

    // Verify field type mappings
    expect(allFields.text?.type).toBe('text');
    expect(allFields.textarea?.type).toBe('textarea');
    expect(allFields.richtext?.type).toBe('writer'); // Kirby's rich text field
    expect(allFields.markdown?.type).toBe('markdown');
    expect(allFields.number?.type).toBe('number');
    expect(allFields.date?.type).toBe('date');
    expect(allFields.datetime?.type).toBe('date'); // Kirby uses 'date' with time option
    expect(allFields.image?.type).toBe('files'); // Kirby uses 'files' for images
    expect(allFields.file?.type).toBe('files');
    expect(allFields.gallery?.type).toBe('files');
    expect(allFields.url?.type).toBe('url');
    expect(allFields.email?.type).toBe('email');
    expect(allFields.select?.type).toBe('select');
    expect(allFields.tags?.type).toBe('tags');
    expect(allFields.boolean?.type).toBe('toggle');

    console.log('✅ Field type mapping verification passed!');
    console.log(`   - Verified ${testEntity.fields.length} field type mappings`);
  });
});
