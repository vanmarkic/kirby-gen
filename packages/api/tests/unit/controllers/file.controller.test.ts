/**
 * File controller unit tests
 */
import { Request, Response } from 'express';
import { promises as fs } from 'fs';
import {
  uploadContentFiles,
  uploadBrandingAssets,
  deleteFile,
  listFiles,
} from '../../../src/controllers/file.controller';
import { container, SERVICE_KEYS } from '@kirby-gen/shared';
import { NotFoundError, FileUploadError } from '../../../src/utils/errors';

// Mock fs
jest.mock('fs', () => ({
  promises: {
    unlink: jest.fn(),
    mkdir: jest.fn(),
  },
}));

const mockStorageService = {
  getProject: jest.fn(),
  updateProject: jest.fn(),
};

// Setup
beforeAll(() => {
  container.register(SERVICE_KEYS.STORAGE, mockStorageService);
});

beforeEach(() => {
  jest.clearAllMocks();
});

describe('File Controller', () => {
  describe('uploadContentFiles', () => {
    it('should upload content files successfully', async () => {
      const mockProject = {
        id: 'test-project',
        status: 'input',
        inputs: {
          contentFiles: [],
          brandingAssets: {},
        },
        updatedAt: new Date(),
      };

      const mockFiles = [
        {
          filename: 'file1-123.txt',
          originalname: 'file1.txt',
          mimetype: 'text/plain',
          size: 1000,
          path: '/uploads/test-project/file1-123.txt',
        },
        {
          filename: 'file2-456.pdf',
          originalname: 'file2.pdf',
          mimetype: 'application/pdf',
          size: 2000,
          path: '/uploads/test-project/file2-456.pdf',
        },
      ] as Express.Multer.File[];

      mockStorageService.getProject.mockResolvedValue(mockProject);
      mockStorageService.updateProject.mockResolvedValue(undefined);

      const req = {
        params: { projectId: 'test-project' },
        files: mockFiles,
      } as unknown as Request;

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      } as unknown as Response;

      await uploadContentFiles(req, res);

      expect(mockStorageService.updateProject).toHaveBeenCalledWith(
        'test-project',
        expect.objectContaining({
          inputs: expect.objectContaining({
            contentFiles: expect.arrayContaining([
              expect.objectContaining({
                filename: 'file1-123.txt',
                originalName: 'file1.txt',
              }),
              expect.objectContaining({
                filename: 'file2-456.pdf',
                originalName: 'file2.pdf',
              }),
            ]),
          }),
        })
      );

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            files: expect.arrayContaining([
              expect.objectContaining({
                filename: 'file1-123.txt',
              }),
            ]),
          }),
        })
      );
    });

    it('should throw FileUploadError if no files uploaded', async () => {
      const req = {
        params: { projectId: 'test-project' },
        files: [],
      } as unknown as Request;

      const res = {} as Response;

      await expect(uploadContentFiles(req, res)).rejects.toThrow(FileUploadError);
    });

    it('should throw NotFoundError and clean up files if project does not exist', async () => {
      const mockFiles = [
        {
          filename: 'file1-123.txt',
          originalname: 'file1.txt',
          mimetype: 'text/plain',
          size: 1000,
          path: '/uploads/test-project/file1-123.txt',
        },
      ] as Express.Multer.File[];

      mockStorageService.getProject.mockResolvedValue(null);
      (fs.unlink as jest.Mock).mockResolvedValue(undefined);

      const req = {
        params: { projectId: 'non-existent' },
        files: mockFiles,
      } as unknown as Request;

      const res = {} as Response;

      await expect(uploadContentFiles(req, res)).rejects.toThrow(NotFoundError);
      expect(fs.unlink).toHaveBeenCalledWith('/uploads/test-project/file1-123.txt');
    });

    it('should append files to existing content files', async () => {
      const existingFile = {
        id: 'existing-id',
        filename: 'existing.txt',
        originalName: 'existing.txt',
        mimeType: 'text/plain',
        size: 500,
        uploadedAt: new Date(),
        path: '/uploads/test-project/existing.txt',
      };

      const mockProject = {
        id: 'test-project',
        status: 'input',
        inputs: {
          contentFiles: [existingFile],
          brandingAssets: {},
        },
        updatedAt: new Date(),
      };

      const mockFiles = [
        {
          filename: 'new-file.txt',
          originalname: 'new.txt',
          mimetype: 'text/plain',
          size: 1000,
          path: '/uploads/test-project/new-file.txt',
        },
      ] as Express.Multer.File[];

      mockStorageService.getProject.mockResolvedValue(mockProject);
      mockStorageService.updateProject.mockResolvedValue(undefined);

      const req = {
        params: { projectId: 'test-project' },
        files: mockFiles,
      } as unknown as Request;

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      } as unknown as Response;

      await uploadContentFiles(req, res);

      expect(mockStorageService.updateProject).toHaveBeenCalledWith(
        'test-project',
        expect.objectContaining({
          inputs: expect.objectContaining({
            contentFiles: expect.arrayContaining([
              existingFile,
              expect.objectContaining({
                filename: 'new-file.txt',
              }),
            ]),
          }),
        })
      );
    });
  });

  describe('uploadBrandingAssets', () => {
    it('should upload logo', async () => {
      const mockProject = {
        id: 'test-project',
        status: 'input',
        inputs: {
          contentFiles: [],
          brandingAssets: {},
        },
        updatedAt: new Date(),
      };

      const mockFiles = {
        logo: [
          {
            filename: 'logo-123.png',
            originalname: 'logo.png',
            mimetype: 'image/png',
            size: 5000,
            path: '/uploads/test-project/logo-123.png',
          },
        ],
      } as unknown as { [fieldname: string]: Express.Multer.File[] };

      mockStorageService.getProject.mockResolvedValue(mockProject);
      mockStorageService.updateProject.mockResolvedValue(undefined);

      const req = {
        params: { projectId: 'test-project' },
        files: mockFiles,
      } as unknown as Request;

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      } as unknown as Response;

      await uploadBrandingAssets(req, res);

      expect(mockStorageService.updateProject).toHaveBeenCalledWith(
        'test-project',
        expect.objectContaining({
          inputs: expect.objectContaining({
            brandingAssets: expect.objectContaining({
              logo: expect.objectContaining({
                filename: 'logo-123.png',
                originalName: 'logo.png',
              }),
            }),
          }),
        })
      );

      expect(res.status).toHaveBeenCalledWith(201);
    });

    it('should upload guidelines', async () => {
      const mockProject = {
        id: 'test-project',
        status: 'input',
        inputs: {
          contentFiles: [],
          brandingAssets: {},
        },
        updatedAt: new Date(),
      };

      const mockFiles = {
        guidelines: [
          {
            filename: 'guidelines-123.pdf',
            originalname: 'guidelines.pdf',
            mimetype: 'application/pdf',
            size: 10000,
            path: '/uploads/test-project/guidelines-123.pdf',
          },
        ],
      } as unknown as { [fieldname: string]: Express.Multer.File[] };

      mockStorageService.getProject.mockResolvedValue(mockProject);
      mockStorageService.updateProject.mockResolvedValue(undefined);

      const req = {
        params: { projectId: 'test-project' },
        files: mockFiles,
      } as unknown as Request;

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      } as unknown as Response;

      await uploadBrandingAssets(req, res);

      expect(mockStorageService.updateProject).toHaveBeenCalledWith(
        'test-project',
        expect.objectContaining({
          inputs: expect.objectContaining({
            brandingAssets: expect.objectContaining({
              guidelines: expect.objectContaining({
                filename: 'guidelines-123.pdf',
              }),
            }),
          }),
        })
      );
    });

    it('should upload both logo and guidelines', async () => {
      const mockProject = {
        id: 'test-project',
        status: 'input',
        inputs: {
          contentFiles: [],
          brandingAssets: {},
        },
        updatedAt: new Date(),
      };

      const mockFiles = {
        logo: [
          {
            filename: 'logo-123.png',
            originalname: 'logo.png',
            mimetype: 'image/png',
            size: 5000,
            path: '/uploads/test-project/logo-123.png',
          },
        ],
        guidelines: [
          {
            filename: 'guidelines-456.pdf',
            originalname: 'guidelines.pdf',
            mimetype: 'application/pdf',
            size: 10000,
            path: '/uploads/test-project/guidelines-456.pdf',
          },
        ],
      } as unknown as { [fieldname: string]: Express.Multer.File[] };

      mockStorageService.getProject.mockResolvedValue(mockProject);
      mockStorageService.updateProject.mockResolvedValue(undefined);

      const req = {
        params: { projectId: 'test-project' },
        files: mockFiles,
      } as unknown as Request;

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      } as unknown as Response;

      await uploadBrandingAssets(req, res);

      expect(mockStorageService.updateProject).toHaveBeenCalledWith(
        'test-project',
        expect.objectContaining({
          inputs: expect.objectContaining({
            brandingAssets: expect.objectContaining({
              logo: expect.any(Object),
              guidelines: expect.any(Object),
            }),
          }),
        })
      );
    });

    it('should throw NotFoundError and clean up files if project does not exist', async () => {
      const mockFiles = {
        logo: [
          {
            filename: 'logo-123.png',
            originalname: 'logo.png',
            mimetype: 'image/png',
            size: 5000,
            path: '/uploads/test-project/logo-123.png',
          },
        ],
      } as unknown as { [fieldname: string]: Express.Multer.File[] };

      mockStorageService.getProject.mockResolvedValue(null);
      (fs.unlink as jest.Mock).mockResolvedValue(undefined);

      const req = {
        params: { projectId: 'non-existent' },
        files: mockFiles,
      } as unknown as Request;

      const res = {} as Response;

      await expect(uploadBrandingAssets(req, res)).rejects.toThrow(NotFoundError);
      expect(fs.unlink).toHaveBeenCalled();
    });
  });

  describe('deleteFile', () => {
    it('should delete a file successfully', async () => {
      const fileToDelete = {
        id: 'file-to-delete',
        filename: 'delete-me.txt',
        originalName: 'delete-me.txt',
        mimeType: 'text/plain',
        size: 1000,
        uploadedAt: new Date(),
        path: '/uploads/test-project/delete-me.txt',
      };

      const mockProject = {
        id: 'test-project',
        status: 'input',
        inputs: {
          contentFiles: [fileToDelete],
          brandingAssets: {},
        },
        updatedAt: new Date(),
      };

      mockStorageService.getProject.mockResolvedValue(mockProject);
      mockStorageService.updateProject.mockResolvedValue(undefined);
      (fs.unlink as jest.Mock).mockResolvedValue(undefined);

      const req = {
        params: {
          projectId: 'test-project',
          fileId: 'file-to-delete',
        },
      } as unknown as Request;

      const res = {
        status: jest.fn().mockReturnThis(),
        send: jest.fn(),
      } as unknown as Response;

      await deleteFile(req, res);

      expect(fs.unlink).toHaveBeenCalledWith('/uploads/test-project/delete-me.txt');
      expect(mockStorageService.updateProject).toHaveBeenCalledWith(
        'test-project',
        expect.objectContaining({
          inputs: expect.objectContaining({
            contentFiles: [],
          }),
        })
      );
      expect(res.status).toHaveBeenCalledWith(204);
    });

    it('should throw NotFoundError if project does not exist', async () => {
      mockStorageService.getProject.mockResolvedValue(null);

      const req = {
        params: {
          projectId: 'non-existent',
          fileId: 'file-id',
        },
      } as unknown as Request;

      const res = {} as Response;

      await expect(deleteFile(req, res)).rejects.toThrow(NotFoundError);
    });

    it('should throw NotFoundError if file does not exist', async () => {
      const mockProject = {
        id: 'test-project',
        status: 'input',
        inputs: {
          contentFiles: [],
          brandingAssets: {},
        },
      };

      mockStorageService.getProject.mockResolvedValue(mockProject);

      const req = {
        params: {
          projectId: 'test-project',
          fileId: 'non-existent-file',
        },
      } as unknown as Request;

      const res = {} as Response;

      await expect(deleteFile(req, res)).rejects.toThrow(NotFoundError);
    });

    it('should still update project even if physical file deletion fails', async () => {
      const fileToDelete = {
        id: 'file-to-delete',
        filename: 'delete-me.txt',
        originalName: 'delete-me.txt',
        mimeType: 'text/plain',
        size: 1000,
        uploadedAt: new Date(),
        path: '/uploads/test-project/delete-me.txt',
      };

      const mockProject = {
        id: 'test-project',
        status: 'input',
        inputs: {
          contentFiles: [fileToDelete],
          brandingAssets: {},
        },
        updatedAt: new Date(),
      };

      mockStorageService.getProject.mockResolvedValue(mockProject);
      mockStorageService.updateProject.mockResolvedValue(undefined);
      (fs.unlink as jest.Mock).mockRejectedValue(new Error('File not found'));

      const req = {
        params: {
          projectId: 'test-project',
          fileId: 'file-to-delete',
        },
      } as unknown as Request;

      const res = {
        status: jest.fn().mockReturnThis(),
        send: jest.fn(),
      } as unknown as Response;

      await deleteFile(req, res);

      expect(mockStorageService.updateProject).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(204);
    });
  });

  describe('listFiles', () => {
    it('should list all files', async () => {
      const mockContentFiles = [
        {
          id: 'file1',
          filename: 'file1.txt',
          originalName: 'file1.txt',
          mimeType: 'text/plain',
          size: 1000,
          uploadedAt: new Date(),
          path: '/uploads/test-project/file1.txt',
        },
      ];

      const mockBrandingAssets = {
        logo: {
          id: 'logo1',
          filename: 'logo.png',
          originalName: 'logo.png',
          mimeType: 'image/png',
          size: 5000,
          uploadedAt: new Date(),
          path: '/uploads/test-project/logo.png',
        },
      };

      const mockProject = {
        id: 'test-project',
        status: 'input',
        inputs: {
          contentFiles: mockContentFiles,
          brandingAssets: mockBrandingAssets,
        },
      };

      mockStorageService.getProject.mockResolvedValue(mockProject);

      const req = {
        params: { projectId: 'test-project' },
      } as unknown as Request;

      const res = {
        json: jest.fn(),
      } as unknown as Response;

      await listFiles(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            contentFiles: mockContentFiles,
            brandingAssets: mockBrandingAssets,
          }),
        })
      );
    });

    it('should throw NotFoundError if project does not exist', async () => {
      mockStorageService.getProject.mockResolvedValue(null);

      const req = {
        params: { projectId: 'non-existent' },
      } as unknown as Request;

      const res = {} as Response;

      await expect(listFiles(req, res)).rejects.toThrow(NotFoundError);
    });
  });
});
