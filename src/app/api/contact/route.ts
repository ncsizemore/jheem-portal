import { handleContactRequest } from '@/lib/contact-handler';
import { checkContactLimit, sendContactEmail } from '@/lib/contact-delivery';

export const runtime = 'nodejs';
export const maxDuration = 30;

export function POST(request: Request) {
  return handleContactRequest(request, { checkLimit: checkContactLimit, send: sendContactEmail });
}
