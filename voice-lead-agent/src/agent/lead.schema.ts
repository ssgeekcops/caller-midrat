import { z } from 'zod';

export const leadSchema = z.object({
  id: z.string(),
  phoneNumber: z.string(),
  name: z.string().optional(),
  email: z.string().email().optional(),
  company: z.string().optional(),
  interested: z.boolean().optional(),
  budget: z.string().optional(),
  timeline: z.string().optional(),
  notes: z.string().optional(),
  callStartedAt: z.string().datetime(),
  callEndedAt: z.string().datetime().optional(),
  callDuration: z.number().optional(),
  callStatus: z.enum(['initiated', 'in-progress', 'completed', 'failed']),
  conversationTranscript: z.array(z.object({
    role: z.enum(['user', 'assistant']),
    content: z.string(),
    timestamp: z.string().datetime(),
  })).optional(),
});

export type Lead = z.infer<typeof leadSchema>;

export function createLead(phoneNumber: string): Lead {
  return {
    id: `lead_${Date.now()}_${Math.random().toString(36).substring(7)}`,
    phoneNumber,
    callStartedAt: new Date().toISOString(),
    callStatus: 'initiated',
  };
}
