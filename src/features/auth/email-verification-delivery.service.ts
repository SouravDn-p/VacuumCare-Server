import { InternalServerErrorException, Injectable } from '@nestjs/common';

@Injectable()
export class EmailVerificationDeliveryService {
  async send(email: string, token: string) {
    if (process.env.NODE_ENV !== 'production') return;
    const apiKey = process.env.RESEND_API_KEY;
    const from = process.env.VERIFICATION_EMAIL_FROM ?? process.env.RESET_EMAIL_FROM;
    const verificationUrl = process.env.EMAIL_VERIFICATION_URL;
    if (!apiKey || !from || !verificationUrl) {
      throw new InternalServerErrorException(
        'Email verification is not configured',
      );
    }
    let link: URL;
    try {
      link = new URL(verificationUrl);
      link.searchParams.set('token', token);
    } catch {
      throw new InternalServerErrorException(
        'EMAIL_VERIFICATION_URL must be an absolute frontend URL',
      );
    }
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: [email],
        subject: 'Verify your Central Care email',
        text: `Use this one-time link to verify your email: ${link.toString()}`,
      }),
    });
    if (!response.ok) {
      throw new InternalServerErrorException(
        'Email verification could not be sent',
      );
    }
  }
}
