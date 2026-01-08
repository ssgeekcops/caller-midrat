import { createLogger } from '../../utils/logger.js';

const logger = createLogger('TwiML');

export interface TwiMLOptions {
  streamUrl: string;
}

/**
 * Generate TwiML for connecting Twilio call to WebSocket stream
 */
export function generateStreamTwiML(options: TwiMLOptions): string {
  const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Connect>
    <Stream url="${options.streamUrl}" />
  </Connect>
</Response>`;

  logger.debug('Generated TwiML for stream', { streamUrl: options.streamUrl });
  return twiml;
}

/**
 * Generate TwiML for saying a message
 */
export function generateSayTwiML(message: string, voice: string = 'Polly.Joanna'): string {
  const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="${voice}">${escapeXml(message)}</Say>
</Response>`;

  logger.debug('Generated TwiML for say', { message });
  return twiml;
}

/**
 * Generate TwiML for hanging up
 */
export function generateHangupTwiML(): string {
  const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Hangup/>
</Response>`;

  logger.debug('Generated TwiML for hangup');
  return twiml;
}

/**
 * Escape XML special characters
 */
function escapeXml(unsafe: string): string {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
