import { promises as fs } from 'fs';
import { createLogger } from '../utils/logger.js';
import type { Lead } from '../agent/lead.schema.js';

const logger = createLogger('JSONLStore');

export class JSONLStore {
  constructor(private filePath: string) {}

  async append(lead: Lead): Promise<void> {
    try {
      const jsonLine = JSON.stringify(lead) + '\n';
      await fs.appendFile(this.filePath, jsonLine, 'utf-8');
      logger.info('Lead saved to JSONL', { leadId: lead.id });
    } catch (error) {
      logger.error('Failed to save lead to JSONL', { error, leadId: lead.id });
      throw error;
    }
  }

  async readAll(): Promise<Lead[]> {
    try {
      const content = await fs.readFile(this.filePath, 'utf-8');
      const lines = content.trim().split('\n').filter(line => line.length > 0);
      return lines.map(line => JSON.parse(line) as Lead);
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        logger.info('JSONL file does not exist yet, returning empty array');
        return [];
      }
      logger.error('Failed to read leads from JSONL', { error });
      throw error;
    }
  }

  async findById(id: string): Promise<Lead | null> {
    const leads = await this.readAll();
    return leads.find(lead => lead.id === id) || null;
  }

  async updateById(id: string, updates: Partial<Lead>): Promise<Lead | null> {
    const leads = await this.readAll();
    const index = leads.findIndex(lead => lead.id === id);
    
    if (index === -1) {
      return null;
    }

    leads[index] = { ...leads[index], ...updates };
    
    // Rewrite entire file
    const content = leads.map(lead => JSON.stringify(lead)).join('\n') + '\n';
    await fs.writeFile(this.filePath, content, 'utf-8');
    
    logger.info('Lead updated in JSONL', { leadId: id });
    return leads[index];
  }
}
