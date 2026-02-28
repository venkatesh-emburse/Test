import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter | null = null;

  constructor(private readonly configService: ConfigService) {
    const user = this.configService.get<string>('email.user');
    const pass = this.configService.get<string>('email.pass');

    if (user && pass) {
      this.transporter = nodemailer.createTransport({
        host: this.configService.get<string>('email.host'),
        port: this.configService.get<number>('email.port'),
        secure: false, // true for 465, false for 587 (STARTTLS)
        auth: { user, pass },
      });
      this.logger.log('📧 Email transporter configured (Gmail SMTP)');
    } else {
      this.logger.warn(
        '📧 Email credentials not configured — OTPs will only be logged to console',
      );
    }
  }

  /**
   * Send OTP code to the given email address.
   * Falls back to console logging if email is not configured.
   */
  async sendOtp(to: string, otpCode: string): Promise<void> {
    if (!this.transporter) {
      this.logger.log(`📧 [NO EMAIL CONFIG] OTP for ${to}: ${otpCode}`);
      return;
    }

    const from = this.configService.get<string>('email.from');

    try {
      await this.transporter.sendMail({
        from,
        to,
        subject: 'Your LiveConnect Login Code',
        html: this.buildOtpEmailHtml(otpCode),
        text: `Your LiveConnect verification code is: ${otpCode}\n\nThis code expires in 10 minutes. If you didn't request this, please ignore this email.`,
      });
      this.logger.log(`📧 OTP email sent to ${to}`);
    } catch (error) {
      this.logger.error(`📧 Failed to send OTP email to ${to}:`, error);
      // Don't throw — let the OTP flow continue (OTP is still stored and
      // retrievable via dev endpoint). In production, you'd want to throw.
    }
  }

  private buildOtpEmailHtml(otpCode: string): string {
    return `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 20px;">
        <div style="text-align: center; margin-bottom: 32px;">
          <div style="display: inline-block; background: #e11d48; border-radius: 16px; padding: 12px 16px;">
            <span style="color: white; font-size: 24px;">❤</span>
          </div>
          <h2 style="margin: 16px 0 4px; color: #111827; font-size: 22px;">LiveConnect</h2>
          <p style="margin: 0; color: #6b7280; font-size: 14px;">Your verification code</p>
        </div>

        <div style="background: #f9fafb; border-radius: 12px; padding: 32px; text-align: center; margin-bottom: 24px;">
          <div style="font-size: 36px; font-weight: 700; letter-spacing: 8px; color: #e11d48; font-family: monospace;">
            ${otpCode}
          </div>
          <p style="margin: 16px 0 0; color: #6b7280; font-size: 13px;">
            This code expires in <strong>10 minutes</strong>
          </p>
        </div>

        <p style="color: #6b7280; font-size: 13px; text-align: center; line-height: 1.5;">
          If you didn't request this code, you can safely ignore this email.
          Someone may have typed your email by mistake.
        </p>

        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />

        <p style="color: #9ca3af; font-size: 11px; text-align: center;">
          LiveConnect — Safety-first dating for genuine connections
        </p>
      </div>
    `;
  }
}
