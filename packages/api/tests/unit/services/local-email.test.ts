import { LocalEmailService } from '../../../src/services/local/local-email.service';
import fs from 'fs-extra';
import path from 'path';

describe('LocalEmailService', () => {
  let service: LocalEmailService;
  let testEmailsDir: string;

  beforeEach(() => {
    testEmailsDir = path.join(__dirname, '../../tmp/test-emails');
    service = new LocalEmailService(testEmailsDir);
  });

  afterEach(async () => {
    await fs.remove(testEmailsDir);
  });

  describe('send', () => {
    it('should log email to file', async () => {
      await service.send({
        to: 'test@example.com',
        subject: 'Test Subject',
        body: 'Test body content'
      });

      const files = await fs.readdir(testEmailsDir);
      expect(files.length).toBe(1);

      const content = await fs.readFile(
        path.join(testEmailsDir, files[0]),
        'utf-8'
      );

      expect(content).toContain('To: test@example.com');
      expect(content).toContain('Subject: Test Subject');
      expect(content).toContain('Test body content');
    });

    it('should create emails directory if not exists', async () => {
      await fs.remove(testEmailsDir);

      await service.send({
        to: 'test@example.com',
        subject: 'Test',
        body: 'Body'
      });

      const exists = await fs.pathExists(testEmailsDir);
      expect(exists).toBe(true);
    });
  });
});
