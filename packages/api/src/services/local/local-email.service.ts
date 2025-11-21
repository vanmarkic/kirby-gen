import { IEmailService, EmailOptions } from '@kirby-gen/shared';
import { logger } from '../../config/logger';
import fs from 'fs-extra';
import path from 'path';

export class LocalEmailService implements IEmailService {
  private readonly emailsDir: string;

  constructor(emailsDir?: string) {
    this.emailsDir = emailsDir || path.join(process.cwd(), 'emails-log');
    fs.ensureDirSync(this.emailsDir);
  }

  async send(options: EmailOptions): Promise<void> {
    // Ensure directory exists
    await fs.ensureDir(this.emailsDir);

    const timestamp = new Date().toISOString();
    const filename = `${timestamp.replace(/[:.]/g, '-')}-email.txt`;
    const filepath = path.join(this.emailsDir, filename);

    const email = `
To: ${options.to}
Subject: ${options.subject}
Date: ${timestamp}

${options.body}
`;

    await fs.writeFile(filepath, email);

    logger.info(`Email logged to: ${filepath}`, {
      to: options.to,
      subject: options.subject
    });
  }
}
