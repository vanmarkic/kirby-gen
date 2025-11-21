export interface IEmailService {
  send(options: EmailOptions): Promise<void>;
}

export interface EmailOptions {
  to: string;
  subject: string;
  body: string;
  html?: string;
}
