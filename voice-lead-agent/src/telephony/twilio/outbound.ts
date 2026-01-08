import twilio from 'twilio';
import { createLogger } from '../../utils/logger.js';
import { env } from '../../config/env.js';

const logger = createLogger('Outbound');

export interface OutboundCallOptions {
  to: string;
  statusCallback?: string;
}

export class OutboundCaller {
  private client: twilio.Twilio;

  constructor(
    accountSid: string = env.TWILIO_ACCOUNT_SID,
    authToken: string = env.TWILIO_AUTH_TOKEN
  ) {
    this.client = twilio(accountSid, authToken);
    logger.info('Outbound caller initialized');
  }

  async makeCall(options: OutboundCallOptions): Promise<string> {
    try {
      const url = `${env.PUBLIC_URL}/api/voice`;
      
      logger.info('Initiating outbound call', { 
        to: options.to,
        from: env.TWILIO_PHONE_NUMBER 
      });

      const call = await this.client.calls.create({
        to: options.to,
        from: env.TWILIO_PHONE_NUMBER,
        url,
        statusCallback: options.statusCallback,
        statusCallbackEvent: ['initiated', 'ringing', 'answered', 'completed'],
        statusCallbackMethod: 'POST',
      });

      logger.info('Call created', { 
        callSid: call.sid, 
        to: options.to 
      });

      return call.sid;
    } catch (error) {
      logger.error('Failed to make outbound call', { 
        error, 
        to: options.to 
      });
      throw error;
    }
  }

  async getCallStatus(callSid: string): Promise<any> {
    try {
      const call = await this.client.calls(callSid).fetch();
      return {
        sid: call.sid,
        status: call.status,
        duration: call.duration,
        to: call.to,
        from: call.from,
      };
    } catch (error) {
      logger.error('Failed to get call status', { error, callSid });
      throw error;
    }
  }

  async endCall(callSid: string): Promise<void> {
    try {
      await this.client.calls(callSid).update({ status: 'completed' });
      logger.info('Call ended', { callSid });
    } catch (error) {
      logger.error('Failed to end call', { error, callSid });
      throw error;
    }
  }
}
