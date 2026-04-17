function renderEmailLayout(title: string, intro: string, ctaLabel: string, ctaUrl: string, footer: string) {
  return [
    '<!doctype html>',
    '<html lang="en">',
    '<body style="margin:0;background:#f4f4f5;font-family:Arial,sans-serif;color:#18181b;">',
    '<div style="margin:0 auto;max-width:640px;padding:32px 16px;">',
    '<div style="border:1px solid #e4e4e7;border-radius:24px;background:#ffffff;padding:32px;">',
    `<p style="margin:0 0 12px;font-size:12px;letter-spacing:0.24em;text-transform:uppercase;color:#71717a;">Next Template</p>`,
    `<h1 style="margin:0 0 16px;font-size:30px;line-height:1.2;color:#09090b;">${title}</h1>`,
    `<p style="margin:0 0 24px;font-size:16px;line-height:1.7;color:#3f3f46;">${intro}</p>`,
    `<a href="${ctaUrl}" style="display:inline-block;border-radius:9999px;background:#18181b;padding:12px 20px;color:#fafafa;text-decoration:none;font-weight:600;">${ctaLabel}</a>`,
    `<p style="margin:24px 0 0;font-size:14px;line-height:1.7;color:#52525b;">${footer}</p>`,
    '</div>',
    '</div>',
    '</body>',
    '</html>',
  ].join('');
}

export function createVerificationEmail(input: { verificationUrl: string; name?: string | null }) {
  const greeting = input.name?.trim() ? `Hi ${input.name.trim()},` : 'Hi,';

  return {
    subject: 'Verify your email address',
    text: `${greeting} verify your email address: ${input.verificationUrl}`,
    html: renderEmailLayout(
      'Verify your email address',
      `${greeting} finish creating your account by confirming that this email address belongs to you.`,
      'Verify email',
      input.verificationUrl,
      'If you did not create this account, you can ignore this message.',
    ),
  };
}

export function createPasswordResetEmail(input: { resetUrl: string }) {
  return {
    subject: 'Reset your password',
    text: `Reset your password: ${input.resetUrl}`,
    html: renderEmailLayout(
      'Reset your password',
      'Use the secure link below to choose a new password for your account. This link expires in one hour.',
      'Choose a new password',
      input.resetUrl,
      'If you did not request a password reset, you can ignore this message.',
    ),
  };
}

export function createNewsletterWelcomeEmail(input: { manageUrl: string }) {
  return {
    subject: 'You are subscribed to the newsletter',
    text: `You are subscribed to the newsletter. Manage your preferences at ${input.manageUrl}`,
    html: renderEmailLayout(
      'You are subscribed',
      'Thanks for joining the newsletter. We will use this inbox for product updates, release notes, and feature announcements.',
      'View communication page',
      input.manageUrl,
      'If this was not you, reply to this message and we can remove the subscription.',
    ),
  };
}
