// src/mail/mail.service.ts
import { Injectable, InternalServerErrorException, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import nodemailer, { Transporter } from 'nodemailer';

@Injectable()
export class MailService implements OnModuleInit {
  private readonly logger = new Logger(MailService.name);
  private readonly transporter: Transporter;

  // للاطلاع في اللوجز
  private readonly smtpHost: string;
  private readonly smtpPort: number;
  private readonly smtpSecure: boolean;
  private readonly defaultFrom: string;

  constructor(private readonly configService: ConfigService) {
    const host = this.configService.get<string>('MAIL_HOST');
    const port = this.parseNumber(this.configService.get<string>('MAIL_PORT'), 587);
    const secure = this.parseBoolean(this.configService.get<string>('MAIL_SECURE'), port === 465);
    const user = this.configService.get<string>('MAIL_USER');
    const pass = this.configService.get<string>('MAIL_PASSWORD');
    const from = this.configService.get<string>('MAIL_FROM') ?? '1KComm <no-reply@oneklient.com>';

    if (!host) throw new Error('MAIL_HOST environment variable is required for email sending');

    this.smtpHost = host;
    this.smtpPort = port;
    this.smtpSecure = secure;
    this.defaultFrom = from;

    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure, // true مع 465 (SSL/TLS) — false مع 587 (STARTTLS)
      auth: user && pass ? { user, pass } : undefined,
      // تحسينات اتصال
      pool: true,
      requireTLS: !secure,                 // مع 587 نضمن STARTTLS
      tls: { minVersion: 'TLSv1.2' },      // تأمين أعلى
      // socketTimeout: 20000,             // (اختياري) مهلة 20 ثانية
    });
  }

  async onModuleInit() {
    try {
      await this.transporter.verify();
      this.logger.log(
        `SMTP verified: ${this.smtpHost}:${this.smtpPort} secure=${this.smtpSecure}`,
      );
    } catch (e) {
      const err = e as Error;
      // نحذر فقط ولا نوقف السيرفر — قد يفشل التحقق رغم أن الإرسال ينجح
      this.logger.warn(
        `SMTP verify failed (${this.smtpHost}:${this.smtpPort} secure=${this.smtpSecure}): ${err.message}`,
      );
    }
  }

  async sendVerificationEmail(recipient: string, code: string): Promise<void> {
    const message = {
      from: this.defaultFrom,
      to: recipient,
      subject: 'Verify your email address',
      text: `Your verification code is ${code}.`,
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6;">
          <h2 style="margin:0 0 12px">Verify your email address</h2>
          <p>Use the following code to confirm your email:</p>
          <p style="font-size: 1.5rem; font-weight: bold; letter-spacing: 2px;">${code}</p>
          <p>This code expires soon. If you did not request this, please ignore this email.</p>
        </div>
      `,
    };

    try {
      const info = await this.transporter.sendMail(message);
      this.logger.log(`Verification email sent to ${recipient}. messageId=${info.messageId}`);
    } catch (error) {
      const err = error as Error;
      this.logger.error('Failed to send verification email', err.stack);
      throw new InternalServerErrorException('Unable to send verification email');
    }
  }

  private parseNumber(value: string | undefined, fallback: number): number {
    if (!value) return fallback;
    const parsed = Number.parseInt(value, 10);
    return Number.isNaN(parsed) ? fallback : parsed;
  }

  private parseBoolean(value: string | undefined, fallback: boolean): boolean {
    if (!value) return fallback;
    const normalized = value.trim().toLowerCase();
    return ['true', '1', 'yes', 'y'].includes(normalized);
  }
}
