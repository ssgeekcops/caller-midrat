import { createLogger } from '../utils/logger.js';

const logger = createLogger('Audio');

// Twilio uses μ-law audio at 8000 Hz
export const TWILIO_AUDIO_CONFIG = {
  sampleRate: 8000,
  encoding: 'mulaw',
  channels: 1,
};

// OpenAI Realtime API uses PCM16 at 24000 Hz
export const OPENAI_AUDIO_CONFIG = {
  sampleRate: 24000,
  encoding: 'pcm16',
  channels: 1,
};

/**
 * Convert base64 encoded μ-law audio from Twilio to PCM16 for OpenAI
 */
export function convertTwilioToOpenAI(base64Audio: string): Buffer {
  try {
    const mulawBuffer = Buffer.from(base64Audio, 'base64');
    // Note: In production, you'd want proper audio resampling and conversion
    // For now, we'll pass through as OpenAI handles some conversion
    return mulawBuffer;
  } catch (error) {
    logger.error('Failed to convert Twilio audio to OpenAI format', { error });
    throw error;
  }
}

/**
 * Convert PCM16 audio from OpenAI to μ-law for Twilio
 */
export function convertOpenAIToTwilio(pcm16Buffer: Buffer): string {
  try {
    // Note: In production, you'd want proper audio resampling and conversion
    // For now, we'll pass through as Twilio handles some conversion
    return pcm16Buffer.toString('base64');
  } catch (error) {
    logger.error('Failed to convert OpenAI audio to Twilio format', { error });
    throw error;
  }
}

/**
 * Create audio chunks from a buffer for streaming
 */
export function createAudioChunks(buffer: Buffer, chunkSize: number = 1024): Buffer[] {
  const chunks: Buffer[] = [];
  for (let i = 0; i < buffer.length; i += chunkSize) {
    chunks.push(buffer.subarray(i, i + chunkSize));
  }
  return chunks;
}
