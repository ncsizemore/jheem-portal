export const CONTACT_MESSAGE_MAX_LENGTH = 5000;
export const CONTACT_EMAIL_MAX_LENGTH = 254;
export const CONTACT_BODY_MAX_BYTES = 24 * 1024;

export interface ContactSubmission {
  message: string;
  email: string;
  website: string;
  submissionId: string;
}

export function parseContactSubmission(value: unknown): ContactSubmission | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const input = value as Record<string, unknown>;
  if (typeof input.message !== 'string' || typeof input.submissionId !== 'string') return null;
  if (input.email !== undefined && typeof input.email !== 'string') return null;
  if (input.website !== undefined && typeof input.website !== 'string') return null;
  const message = input.message.trim();
  const email = ((input.email as string | undefined) ?? '').trim();
  const website = ((input.website as string | undefined) ?? '').trim();
  if (!message || message.length > CONTACT_MESSAGE_MAX_LENGTH || /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(message)) return null;
  if (email.length > CONTACT_EMAIL_MAX_LENGTH || (email && !/^[^\s<>@,;]+@[^\s<>@,;]+\.[^\s<>@,;]+$/.test(email))) return null;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(input.submissionId)) return null;
  return { message, email, website, submissionId: input.submissionId };
}
