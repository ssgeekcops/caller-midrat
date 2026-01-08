import { createLogger } from '../utils/logger.js';

const logger = createLogger('StateMachine');

export enum AgentState {
  GREETING = 'greeting',
  QUALIFYING = 'qualifying',
  GATHERING_INFO = 'gathering_info',
  CLOSING = 'closing',
  ENDED = 'ended',
}

export type StateTransition = {
  from: AgentState;
  to: AgentState;
  timestamp: Date;
};

export class StateMachine {
  private currentState: AgentState;
  private transitions: StateTransition[] = [];

  constructor(initialState: AgentState = AgentState.GREETING) {
    this.currentState = initialState;
    logger.debug('State machine initialized', { initialState });
  }

  getCurrentState(): AgentState {
    return this.currentState;
  }

  getTransitions(): StateTransition[] {
    return [...this.transitions];
  }

  transition(to: AgentState): void {
    const from = this.currentState;
    this.currentState = to;
    this.transitions.push({
      from,
      to,
      timestamp: new Date(),
    });
    logger.info('State transition', { from, to });
  }

  canTransition(from: AgentState, to: AgentState): boolean {
    const validTransitions: Record<AgentState, AgentState[]> = {
      [AgentState.GREETING]: [AgentState.QUALIFYING, AgentState.ENDED],
      [AgentState.QUALIFYING]: [AgentState.GATHERING_INFO, AgentState.CLOSING, AgentState.ENDED],
      [AgentState.GATHERING_INFO]: [AgentState.CLOSING, AgentState.ENDED],
      [AgentState.CLOSING]: [AgentState.ENDED],
      [AgentState.ENDED]: [],
    };

    return validTransitions[from]?.includes(to) ?? false;
  }

  safeTransition(to: AgentState): boolean {
    if (this.canTransition(this.currentState, to)) {
      this.transition(to);
      return true;
    }
    logger.warn('Invalid state transition attempted', { 
      from: this.currentState, 
      to 
    });
    return false;
  }
}
