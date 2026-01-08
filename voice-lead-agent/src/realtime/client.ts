import { RealtimeClient } from '@openai/realtime-api-beta';
import { createLogger } from '../utils/logger.js';
import { SYSTEM_PROMPT } from './prompts.js';

const logger = createLogger('RealtimeClient');

export interface RealtimeClientOptions {
  apiKey: string;
  onMessage?: (message: any) => void;
  onError?: (error: any) => void;
}

export class OpenAIRealtimeClient {
  private client: RealtimeClient;
  private isConnected: boolean = false;

  constructor(private options: RealtimeClientOptions) {
    this.client = new RealtimeClient({
      apiKey: options.apiKey,
      dangerouslyAllowAPIKeyInBrowser: false,
    });

    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    this.client.on('conversation.updated', (event: any) => {
      logger.debug('Conversation updated', { event });
      this.options.onMessage?.(event);
    });

    this.client.on('error', (error: any) => {
      logger.error('Realtime client error', { error });
      this.options.onError?.(error);
    });

    this.client.on('conversation.item.completed', (event: any) => {
      logger.debug('Conversation item completed', { event });
    });
  }

  async connect(): Promise<void> {
    try {
      await this.client.connect();
      this.isConnected = true;
      
      // Configure session
      await this.client.updateSession({
        instructions: SYSTEM_PROMPT,
        voice: 'alloy',
        input_audio_transcription: { model: 'whisper-1' },
        turn_detection: { type: 'server_vad' },
      });

      logger.info('Connected to OpenAI Realtime API');
    } catch (error) {
      logger.error('Failed to connect to OpenAI Realtime API', { error });
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    try {
      if (this.isConnected) {
        await this.client.disconnect();
        this.isConnected = false;
        logger.info('Disconnected from OpenAI Realtime API');
      }
    } catch (error) {
      logger.error('Failed to disconnect from OpenAI Realtime API', { error });
      throw error;
    }
  }

  async sendAudio(audioData: ArrayBuffer): Promise<void> {
    try {
      if (!this.isConnected) {
        throw new Error('Client is not connected');
      }
      await this.client.appendInputAudio(audioData);
    } catch (error) {
      logger.error('Failed to send audio', { error });
      throw error;
    }
  }

  async createResponse(): Promise<void> {
    try {
      if (!this.isConnected) {
        throw new Error('Client is not connected');
      }
      await this.client.createResponse();
    } catch (error) {
      logger.error('Failed to create response', { error });
      throw error;
    }
  }

  getClient(): RealtimeClient {
    return this.client;
  }

  isClientConnected(): boolean {
    return this.isConnected;
  }
}
