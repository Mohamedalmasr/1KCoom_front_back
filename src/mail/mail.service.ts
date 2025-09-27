import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import nodemailer, { Transporter } from 'nodemailer';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly transporter: Transporter;

  constructor(private readonly configService: ConfigService) {
    const host = this.configService.get<string>('MAIL_HOST');
    const port = this.parseNumber(this.configService.get<string>('MAIL_PORT'), 587);
    const secure = this.parseBoolean(this.configService.get<string>('MAIL_SECURE'), port === 465);
    const user = this.configService.get<string>('MAIL_USER');
    const pass = this.configService.get<string>('MAIL_PASSWORD');

    if (!host) {
      throw new Error('MAIL_HOST environment variable is required for email sending');
    }

    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: user && pass ? { user, pass } : undefined,
    });
  }

  async sendVerificationEmail(recipient: string, code: string): Promise<void> {
    const from = this.configService.get<string>('MAIL_FROM') ?? 'no-reply@1kcomm.local';

    const message = {
      from,
      to: recipient,
      subject: 'Verify your email address',
      text: `Your verification code is ${code}.`,
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6;">
          <h2>Verify your email address</h2>
          <p>Use the following code to confirm your email:</p>
          <p style="font-size: 1.5rem; font-weight: bold;">${code}</p>
          <p>This code expires soon. If you did not request this, please ignore this email.</p>
        </div>
      `,
    };

    try {
      await this.transporter.sendMail(message);
    } catch (error) {
      this.logger.error('Failed to send verification email', error as Error);
      throw new InternalServerErrorException('Unable to send verification email');
    }
  }

  private parseNumber(value: string | undefined, fallback: number): number {
    if (!value) {
      return fallback;
    }

    const parsed = Number.parseInt(value, 10);
    return Number.isNaN(parsed) ? fallback : parsed;
  }

  private parseBoolean(value: string | undefined, fallback: boolean): boolean {
    if (!value) {
      return fallback;
    }

    const normalized = value.trim().toLowerCase();
    return ['true', '1', 'yes', 'y'].includes(normalized);
  }
}
