/**
 * Integration Test: File Upload
 * Tests uploading binary files via API endpoint and verifying storage
 */
import * as fs from 'fs-extra';
import * as path from 'path';
import * as crypto from 'crypto';
import request from 'supertest';
import { LocalStorageService } from '../../src/services/local/storage.service';

describe('File Upload Integration', () => {
  let storageService: LocalStorageService;
  let testDir: string;
  let uploadDir: string;
  let projectId: string;
  let app: any;

  beforeAll(async () => {
    // Create unique test directories
    testDir = path.join(__dirname, '../test-data/upload-integration', crypto.randomUUID());
    uploadDir = path.join(testDir, 'uploads');
    await fs.ensureDir(testDir);
    await fs.ensureDir(uploadDir);

    storageService = new LocalStorageService({ basePath: testDir, createDirectories: true });

    // Create Express app with file routes
    const express = require('express');
    const fileRoutes = require('../../src/routes/file.routes').default;
    const { errorHandler } = require('../../src/middleware/error-handler');
    const { container, SERVICE_KEYS } = require('@kirby-gen/shared');

    // Setup DI with test storage service
    container.register(SERVICE_KEYS.STORAGE, () => storageService, true);

    app = express();
    app.use(express.json());

    // Set upload dir in env
    process.env.UPLOAD_DIR = uploadDir;

    app.use('/api/projects', fileRoutes);
    app.use(errorHandler);
  });

  afterAll(async () => {
    await fs.remove(testDir);
  });

  beforeEach(async () => {
    // Create test project
    const project = await storageService.createProject({
      id: `test-${crypto.randomUUID().substring(0, 8)}`,
      name: 'File Upload Test Project',
      createdAt: new Date(),
      updatedAt: new Date(),
      inputs: {
        contentFiles: [],
        brandingAssets: {},
      },
      status: 'input',
      currentStep: 1,
      totalSteps: 5,
      errors: [],
    });

    projectId = project.id;
  });

  it('should upload 2 binary files (100KB each) and save them correctly', async () => {
    // ===== STEP 1: Generate 2 binary files (100KB each) =====
    // Create minimal valid PNG files with random data
    const file1Content = Buffer.concat([
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), // PNG signature
      crypto.randomBytes(100 * 1024 - 8), // Fill to 100KB
    ]);
    const file2Content = Buffer.concat([
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), // PNG signature
      crypto.randomBytes(100 * 1024 - 8), // Fill to 100KB
    ]);

    const file1Path = path.join(testDir, 'test-file-1.png');
    const file2Path = path.join(testDir, 'test-file-2.png');

    await fs.writeFile(file1Path, file1Content);
    await fs.writeFile(file2Path, file2Content);

    expect(await fs.pathExists(file1Path)).toBe(true);
    expect(await fs.pathExists(file2Path)).toBe(true);

    const file1Stats = await fs.stat(file1Path);
    const file2Stats = await fs.stat(file2Path);

    expect(file1Stats.size).toBe(100 * 1024);
    expect(file2Stats.size).toBe(100 * 1024);

    console.log('✅ Generated 2 binary files (100KB each)');

    // ===== STEP 2: Upload files via API =====
    const response = await request(app)
      .post(`/api/projects/${projectId}/files/content`)
      .attach('files', file1Path)
      .attach('files', file2Path);

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data.files).toHaveLength(2);

    const uploadedFiles = response.body.data.files;

    console.log('✅ Uploaded 2 files via API:', {
      file1: uploadedFiles[0].filename,
      file2: uploadedFiles[1].filename,
    });

    // ===== STEP 3: Verify files are saved on disk =====
    const savedFile1Path = uploadedFiles[0].path;
    const savedFile2Path = uploadedFiles[1].path;

    expect(await fs.pathExists(savedFile1Path)).toBe(true);
    expect(await fs.pathExists(savedFile2Path)).toBe(true);

    const savedFile1Stats = await fs.stat(savedFile1Path);
    const savedFile2Stats = await fs.stat(savedFile2Path);

    expect(savedFile1Stats.size).toBe(100 * 1024);
    expect(savedFile2Stats.size).toBe(100 * 1024);

    console.log('✅ Verified files saved on disk:', {
      file1: savedFile1Path,
      file2: savedFile2Path,
      file1Size: savedFile1Stats.size,
      file2Size: savedFile2Stats.size,
    });

    // ===== STEP 4: Verify file contents are identical =====
    const savedFile1Content = await fs.readFile(savedFile1Path);
    const savedFile2Content = await fs.readFile(savedFile2Path);

    expect(savedFile1Content.equals(file1Content)).toBe(true);
    expect(savedFile2Content.equals(file2Content)).toBe(true);

    console.log('✅ Verified file contents match original');

    // ===== STEP 5: Verify project metadata was updated =====
    const updatedProject = await storageService.getProject(projectId);

    expect(updatedProject).toBeDefined();
    expect(updatedProject?.inputs.contentFiles).toHaveLength(2);

    const file1Ref = updatedProject?.inputs.contentFiles[0];
    const file2Ref = updatedProject?.inputs.contentFiles[1];

    expect(file1Ref?.id).toBeDefined();
    expect(file1Ref?.size).toBe(100 * 1024);
    expect(file1Ref?.mimeType).toBe('image/png');
    expect(file1Ref?.uploadedAt).toBeDefined();

    expect(file2Ref?.id).toBeDefined();
    expect(file2Ref?.size).toBe(100 * 1024);
    expect(file2Ref?.mimeType).toBe('image/png');
    expect(file2Ref?.uploadedAt).toBeDefined();

    console.log('✅ Verified project metadata updated:', {
      totalFiles: updatedProject?.inputs.contentFiles.length,
      file1Id: file1Ref?.id,
      file2Id: file2Ref?.id,
    });

    // ===== STEP 6: Verify files can be listed via API =====
    const listResponse = await request(app).get(`/api/projects/${projectId}/files`);

    expect(listResponse.status).toBe(200);
    expect(listResponse.body.success).toBe(true);
    expect(listResponse.body.data.contentFiles).toHaveLength(2);

    console.log('✅ Verified files can be listed via API');

    // ===== STEP 7: Verify file is in correct directory structure =====
    // Files are saved with paths relative to cwd or absolute
    const savedDir = path.dirname(savedFile1Path);
    expect(await fs.pathExists(savedDir)).toBe(true);

    const filesInDir = await fs.readdir(savedDir);
    expect(filesInDir).toHaveLength(2);

    console.log('✅ Verified directory structure:', {
      uploadDir: savedDir,
      filesCount: filesInDir.length,
    });

    // Clean up generated test files
    await fs.unlink(file1Path);
    await fs.unlink(file2Path);

    console.log('\n🎉 Full file upload integration test passed!');
    console.log('   - Generated: 2 x 100KB binary files');
    console.log('   - Uploaded: via POST /api/projects/:projectId/files/content');
    console.log('   - Saved: files to disk with correct size and content');
    console.log('   - Updated: project metadata with file references');
    console.log('   - Verified: file listing and directory structure');
  }, 30000); // 30 second timeout

  it('should reject files that exceed size limit', async () => {
    // Generate a file larger than MAX_FILE_SIZE (default 50MB)
    const largeFileContent = Buffer.concat([
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), // PNG signature
      crypto.randomBytes(60 * 1024 * 1024 - 8), // Fill to 60MB
    ]);
    const largeFilePath = path.join(testDir, 'large-file.png');

    await fs.writeFile(largeFilePath, largeFileContent);

    const response = await request(app)
      .post(`/api/projects/${projectId}/files/content`)
      .attach('files', largeFilePath);

    expect(response.status).toBe(400);

    // Clean up
    await fs.unlink(largeFilePath);

    console.log('✅ Correctly rejected file exceeding size limit');
  });

  it('should handle empty upload gracefully', async () => {
    const response = await request(app).post(`/api/projects/${projectId}/files/content`);

    expect(response.status).toBe(400);

    console.log('✅ Handled empty upload gracefully');
  });

  it('should upload files with special characters in filename', async () => {
    const fileContent = Buffer.concat([
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), // PNG signature
      crypto.randomBytes(50 * 1024 - 8), // Fill to 50KB
    ]);
    const specialFileName = 'test file with spaces & symbols (1).png';
    const filePath = path.join(testDir, specialFileName);

    await fs.writeFile(filePath, fileContent);

    const response = await request(app)
      .post(`/api/projects/${projectId}/files/content`)
      .attach('files', filePath);

    expect(response.status).toBe(201);
    expect(response.body.data.files).toHaveLength(1);
    expect(response.body.data.files[0].originalName).toBe(specialFileName);

    // Clean up
    await fs.unlink(filePath);

    console.log('✅ Handled special characters in filename');
  });
});
