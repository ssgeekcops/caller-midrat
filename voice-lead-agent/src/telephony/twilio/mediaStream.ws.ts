import WebSocket from 'ws';
import { createLogger } from '../../utils/logger.js';
import { Agent } from '../../agent/agent.js';
import { convertTwilioToOpenAI } from '../../realtime/audio.js';

const logger = createLogger('MediaStream');

export interface MediaStreamMessage {
  event: string;
  streamSid?: string;
  media?: {
    payload: string;
    timestamp: string;
  };
  start?: {
    streamSid: string;
    callSid: string;
    customParameters: any;
  };
  stop?: {
    streamSid: string;
  };
}

export class MediaStreamHandler {
  private streamSid: string | null = null;
  private callSid: string | null = null;

  constructor(
    private ws: WebSocket,
    private agent: Agent
  ) {
    logger.info('MediaStream handler created');
    this.setupWebSocket();
  }

  private setupWebSocket(): void {
    this.ws.on('message', async (data: Buffer) => {
      try {
        const message: MediaStreamMessage = JSON.parse(data.toString());
        await this.handleMessage(message);
      } catch (error) {
        logger.error('Error handling WebSocket message', { error });
      }
    });

    this.ws.on('close', () => {
      logger.info('WebSocket closed', { 
        streamSid: this.streamSid,
        callSid: this.callSid 
      });
      this.handleClose();
    });

    this.ws.on('error', (error) => {
      logger.error('WebSocket error', { error });
    });
  }

  private async handleMessage(message: MediaStreamMessage): Promise<void> {
    switch (message.event) {
      case 'start':
        await this.handleStart(message);
        break;
      case 'media':
        await this.handleMedia(message);
        break;
      case 'stop':
        await this.handleStop(message);
        break;
      default:
        logger.debug('Unknown event type', { event: message.event });
    }
  }

  private async handleStart(message: MediaStreamMessage): Promise<void> {
    if (message.start) {
      this.streamSid = message.start.streamSid;
      this.callSid = message.start.callSid;
      
      logger.info('Media stream started', {
        streamSid: this.streamSid,
        callSid: this.callSid,
      });

      await this.agent.updateLead({ callStatus: 'in-progress' });
    }
  }

  private async handleMedia(message: MediaStreamMessage): Promise<void> {
    if (message.media) {
      try {
        // Convert Twilio μ-law audio to format OpenAI expects
        const audioBuffer = convertTwilioToOpenAI(message.media.payload);
        
        // Send to OpenAI Realtime API - convert Buffer to ArrayBuffer
        const arrayBuffer = audioBuffer.buffer.slice(
          audioBuffer.byteOffset,
          audioBuffer.byteOffset + audioBuffer.byteLength
        ) as ArrayBuffer;
        await this.agent.processAudio(arrayBuffer);
        
        // Note: Response audio from OpenAI will be handled by the realtime client events
      } catch (error) {
        logger.error('Error processing media', { error });
      }
    }
  }

  private async handleStop(message: MediaStreamMessage): Promise<void> {
    logger.info('Media stream stopped', { streamSid: message.stop?.streamSid });
    await this.handleClose();
  }

  private async handleClose(): Promise<void> {
    try {
      await this.agent.endCall();
    } catch (error) {
      logger.error('Error closing media stream', { error });
    }
  }

  sendAudio(audioData: string): void {
    if (this.ws.readyState === WebSocket.OPEN) {
      const message = {
        event: 'media',
        streamSid: this.streamSid,
        media: {
          payload: audioData,
        },
      };
      this.ws.send(JSON.stringify(message));
    }
  }

  sendMark(name: string): void {
    if (this.ws.readyState === WebSocket.OPEN) {
      const message = {
        event: 'mark',
        streamSid: this.streamSid,
        mark: {
          name,
        },
      };
      this.ws.send(JSON.stringify(message));
    }
  }
}
