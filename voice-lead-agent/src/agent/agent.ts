import { StateMachine, AgentState } from './stateMachine.js';
import { Lead, createLead } from './lead.schema.js';
import { JSONLStore } from '../storage/jsonl.store.js';
import { createLogger } from '../utils/logger.js';
import { OpenAIRealtimeClient } from '../realtime/client.js';

const logger = createLogger('Agent');

export interface AgentConfig {
  openaiApiKey: string;
  leadsStore: JSONLStore;
}

export class Agent {
  private stateMachine: StateMachine;
  private lead: Lead;
  private realtimeClient: OpenAIRealtimeClient | null = null;

  constructor(
    phoneNumber: string,
    private config: AgentConfig
  ) {
    this.stateMachine = new StateMachine(AgentState.GREETING);
    this.lead = createLead(phoneNumber);
    logger.info('Agent created for lead', { 
      leadId: this.lead.id, 
      phoneNumber 
    });
  }

  async initialize(): Promise<void> {
    try {
      // Save initial lead state
      await this.config.leadsStore.append(this.lead);
      
      // Initialize OpenAI Realtime client
      this.realtimeClient = new OpenAIRealtimeClient({
        apiKey: this.config.openaiApiKey,
        onMessage: this.handleRealtimeMessage.bind(this),
        onError: this.handleRealtimeError.bind(this),
        onAudioResponse: this.handleAudioResponse.bind(this),
      });

      await this.realtimeClient.connect();
      logger.info('Agent initialized', { leadId: this.lead.id });
    } catch (error) {
      logger.error('Failed to initialize agent', { error, leadId: this.lead.id });
      throw error;
    }
  }

  private handleRealtimeMessage(message: any): void {
    logger.debug('Received realtime message', { message, leadId: this.lead.id });
    // Process conversation updates and extract information
    this.processConversationUpdate(message);
  }

  private handleRealtimeError(error: any): void {
    logger.error('Realtime client error', { error, leadId: this.lead.id });
  }

  private handleAudioResponse(_audioData: string): void {
    logger.debug('Received audio response from OpenAI', { leadId: this.lead.id });
    // Audio response will be handled by the MediaStreamHandler
  }

  private async processConversationUpdate(_update: any): Promise<void> {
    // Extract information from conversation
    // Update lead data based on conversation
    // Transition states as needed
    
    const currentState = this.stateMachine.getCurrentState();
    
    // Simple state progression logic
    if (currentState === AgentState.GREETING) {
      // After greeting, move to qualifying
      setTimeout(() => {
        this.stateMachine.safeTransition(AgentState.QUALIFYING);
      }, 5000);
    } else if (currentState === AgentState.QUALIFYING) {
      // After qualifying, move to gathering info
      setTimeout(() => {
        this.stateMachine.safeTransition(AgentState.GATHERING_INFO);
      }, 10000);
    } else if (currentState === AgentState.GATHERING_INFO) {
      // After gathering info, move to closing
      setTimeout(() => {
        this.stateMachine.safeTransition(AgentState.CLOSING);
      }, 15000);
    }
  }

  async processAudio(audioData: ArrayBuffer): Promise<void> {
    if (!this.realtimeClient) {
      throw new Error('Realtime client not initialized');
    }
    await this.realtimeClient.sendAudio(audioData);
  }

  async updateLead(updates: Partial<Lead>): Promise<void> {
    this.lead = { ...this.lead, ...updates };
    await this.config.leadsStore.updateById(this.lead.id, updates);
    logger.info('Lead updated', { leadId: this.lead.id, updates });
  }

  async endCall(): Promise<void> {
    try {
      this.stateMachine.safeTransition(AgentState.ENDED);
      
      const callEndedAt = new Date().toISOString();
      const callDuration = Math.floor(
        (new Date(callEndedAt).getTime() - new Date(this.lead.callStartedAt).getTime()) / 1000
      );

      await this.updateLead({
        callEndedAt,
        callDuration,
        callStatus: 'completed',
      });

      if (this.realtimeClient) {
        await this.realtimeClient.disconnect();
      }

      logger.info('Call ended', { 
        leadId: this.lead.id, 
        duration: callDuration 
      });
    } catch (error) {
      logger.error('Error ending call', { error, leadId: this.lead.id });
      throw error;
    }
  }

  getLead(): Lead {
    return { ...this.lead };
  }

  getState(): AgentState {
    return this.stateMachine.getCurrentState();
  }

  getRealtimeClient(): OpenAIRealtimeClient | null {
    return this.realtimeClient;
  }
}
