import WebSocket from 'ws';
import { createLogger } from '../utils/logger.js';
import { SYSTEM_PROMPT } from './prompts.js';

const logger = createLogger('RealtimeClient');

export interface RealtimeClientOptions {
  apiKey: string;
  onMessage?: (message: any) => void;
  onError?: (error: any) => void;
  onAudioResponse?: (audioData: string) => void;
}

interface RealtimeEvent {
  type: string;
  event_id?: string;
  [key: string]: any;
}

export class OpenAIRealtimeClient {
  private ws: WebSocket | null = null;
  private isConnected: boolean = false;
  private apiKey: string;

  constructor(private options: RealtimeClientOptions) {
    this.apiKey = options.apiKey;
  }

  async connect(): Promise<void> {
    try {
      const url = 'wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-10-01';
      
      this.ws = new WebSocket(url, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'OpenAI-Beta': 'realtime=v1',
        },
      });

      return new Promise((resolve, reject) => {
        if (!this.ws) return reject(new Error('WebSocket not initialized'));

        this.ws.on('open', () => {
          logger.info('Connected to OpenAI Realtime API');
          this.isConnected = true;
          this.configureSession();
          resolve();
        });

        this.ws.on('message', (data: Buffer) => {
          try {
            const event: RealtimeEvent = JSON.parse(data.toString());
            this.handleEvent(event);
          } catch (error) {
            logger.error('Failed to parse WebSocket message', { error });
          }
        });

        this.ws.on('error', (error) => {
          logger.error('WebSocket error', { error });
          this.options.onError?.(error);
          reject(error);
        });

        this.ws.on('close', () => {
          logger.info('WebSocket closed');
          this.isConnected = false;
        });
      });
    } catch (error) {
      logger.error('Failed to connect to OpenAI Realtime API', { error });
      throw error;
    }
  }

  private configureSession(): void {
    const sessionUpdate = {
      type: 'session.update',
      session: {
        modalities: ['text', 'audio'],
        instructions: SYSTEM_PROMPT,
        voice: 'alloy',
        input_audio_format: 'pcm16',
        output_audio_format: 'pcm16',
        input_audio_transcription: {
          model: 'whisper-1',
        },
        turn_detection: {
          type: 'server_vad',
          threshold: 0.5,
          prefix_padding_ms: 300,
          silence_duration_ms: 500,
        },
      },
    };

    this.sendEvent(sessionUpdate);
  }

  private handleEvent(event: RealtimeEvent): void {
    logger.debug('Received event', { type: event.type });

    switch (event.type) {
      case 'session.created':
      case 'session.updated':
        logger.info('Session configured');
        break;
      
      case 'conversation.item.created':
      case 'conversation.item.input_audio_transcription.completed':
        this.options.onMessage?.(event);
        break;
      
      case 'response.audio.delta':
        if (event.delta) {
          this.options.onAudioResponse?.(event.delta);
        }
        break;
      
      case 'response.audio.done':
        logger.debug('Audio response completed');
        break;
      
      case 'error':
        logger.error('Realtime API error', { error: event });
        this.options.onError?.(event);
        break;
      
      default:
        logger.debug('Unhandled event type', { type: event.type });
    }
  }

  private sendEvent(event: RealtimeEvent): void {
    if (this.ws && this.isConnected) {
      this.ws.send(JSON.stringify(event));
    }
  }

  async send(event: RealtimeEvent): Promise<void> {
    try {
      if (!this.isConnected) {
        throw new Error('Client is not connected');
      }
      this.sendEvent(event);
    } catch (error) {
      logger.error('Failed to send event', { error, eventType: event.type });
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    try {
      if (this.ws && this.isConnected) {
        this.ws.close();
        this.ws = null;
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

      const base64Audio = Buffer.from(audioData).toString('base64');
      
      this.sendEvent({
        type: 'input_audio_buffer.append',
        audio: base64Audio,
      });
    } catch (error) {
      logger.error('Failed to send audio', { error });
      throw error;
    }
  }

  async commitAudio(): Promise<void> {
    try {
      if (!this.isConnected) {
        throw new Error('Client is not connected');
      }

      this.sendEvent({
        type: 'input_audio_buffer.commit',
      });
    } catch (error) {
      logger.error('Failed to commit audio buffer', { error });
      throw error;
    }
  }

  async createResponse(): Promise<void> {
    try {
      if (!this.isConnected) {
        throw new Error('Client is not connected');
      }
      
      this.sendEvent({
        type: 'response.create',
        response: {
          modalities: ['audio', 'text'],
        },
      });
    } catch (error) {
      logger.error('Failed to create response', { error });
      throw error;
    }
  }

  isClientConnected(): boolean {
    return this.isConnected;
  }
}
