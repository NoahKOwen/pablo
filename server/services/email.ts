import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import {
  generateVerificationEmail,
  generatePasswordResetEmail,
  generateDepositConfirmationEmail,
  generateWithdrawalNotificationEmail,
  generateAchievementUnlockEmail,
  generateWelcomeEmail,
} from '../email/templates';

const SMTP_HOST = 'smtp-relay.brevo.com';
const SMTP_PORT = 587;
const SMTP_USER = '95624d002@smtp-brevo.com';
const SMTP_PASS = process.env.SMTP_PASSWORD;
const FROM_EMAIL = 'NextGen Rise Foundation <noreply@xnrt.org>';

let transporter: Transporter | null = null;

function getTransporter(): Transporter {
  if (!transporter) {
    if (!SMTP_PASS) {
      throw new Error('SMTP_PASSWORD environment variable is not set');
    }

    console.log('[EMAIL] Initializing SMTP transporter', {
      host: SMTP_HOST,
      port: SMTP_PORT,
      user: SMTP_USER,
      from: FROM_EMAIL,
    });

    transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: false, // use STARTTLS
      auth: {
        user: SMTP_USER,
        pass: SMTP_PASS,
      },
    });
  }

  return transporter;
}

interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export async function sendEmail(options: SendEmailOptions): Promise<void> {
  const transport = getTransporter();
  const start = Date.now();

  console.log('[EMAIL] sending', {
    to: options.to,
    subject: options.subject,
    at: new Date().toISOString(),
  });

  try {
    await transport.sendMail({
      from: FROM_EMAIL,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text || options.html.replace(/<[^>]*>/g, ''), // Strip HTML for text version
    });

    console.log('[EMAIL] sent', {
      to: options.to,
      subject: options.subject,
      ms: Date.now() - start,
      at: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[EMAIL] send failed', {
      to: options.to,
      subject: options.subject,
      ms: Date.now() - start,
      at: new Date().toISOString(),
      error,
    });
    throw error;
  }
}

export async function sendVerificationEmail(email: string, username: string, token: string): Promise<void> {
  const baseUrl = process.env.APP_URL || 'https://xnrt.org';

  await sendEmail({
    to: email,
    subject: 'Verify Your Email - XNRT Platform',
    html: generateVerificationEmail(email, token, baseUrl),
  });
}

export async function sendPasswordResetEmail(email: string, username: string, token: string): Promise<void> {
  const baseUrl = process.env.APP_URL || 'https://xnrt.org';

  await sendEmail({
    to: email,
    subject: 'Reset Your Password - XNRT Platform',
    html: generatePasswordResetEmail(email, token, baseUrl),
  });
}

export async function sendWelcomeEmail(email: string, username: string): Promise<void> {
  const baseUrl = process.env.APP_URL || 'https://xnrt.org';

  await sendEmail({
    to: email,
    subject: 'Welcome to XNRT - Start Earning Today!',
    html: generateWelcomeEmail(email, username, baseUrl),
  });
}

export async function sendDepositConfirmation(
  email: string,
  amount: number,
  xnrtAmount: number,
  txHash: string,
  confirmations: number
): Promise<void> {
  await sendEmail({
    to: email,
    subject: `Deposit Confirmed: ${amount} USDT → ${xnrtAmount.toLocaleString()} XNRT`,
    html: generateDepositConfirmationEmail(email, amount, xnrtAmount, txHash, confirmations),
  });
}

export async function sendWithdrawalNotification(
  email: string,
  amount: number,
  usdtAmount: number,
  status: 'pending' | 'approved' | 'rejected',
  walletAddress?: string
): Promise<void> {
  const statusText = status === 'approved' ? 'Approved' : status === 'rejected' ? 'Rejected' : 'Pending';

  await sendEmail({
    to: email,
    subject: `Withdrawal ${statusText}: ${amount.toLocaleString()} XNRT`,
    html: generateWithdrawalNotificationEmail(email, amount, usdtAmount, status, walletAddress),
  });
}

export async function sendAchievementUnlock(
  email: string,
  achievementName: string,
  achievementDescription: string,
  xpReward: number
): Promise<void> {
  await sendEmail({
    to: email,
    subject: `🏆 Achievement Unlocked: ${achievementName}`,
    html: generateAchievementUnlockEmail(email, achievementName, achievementDescription, xpReward),
  });
}
