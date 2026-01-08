import express, { Request, Response } from 'express';
import { WebSocketServer, WebSocket } from 'ws';
import { createServer } from 'http';
import { createLogger } from '../utils/logger.js';
import { generateStreamTwiML } from '../telephony/twilio/twiml.js';
import { MediaStreamHandler } from '../telephony/twilio/mediaStream.ws.js';
import { Agent } from '../agent/agent.js';
import { JSONLStore } from '../storage/jsonl.store.js';
import { env } from '../config/env.js';

const logger = createLogger('HTTPServer');

export interface ServerConfig {
  port: number;
  openaiApiKey: string;
  leadsStore: JSONLStore;
}

export class HTTPServer {
  private app: express.Application;
  private server: ReturnType<typeof createServer>;
  private wss: WebSocketServer;
  private agents: Map<string, Agent> = new Map();

  constructor(private config: ServerConfig) {
    this.app = express();
    this.server = createServer(this.app);
    this.wss = new WebSocketServer({ server: this.server, path: '/media-stream' });

    this.setupMiddleware();
    this.setupRoutes();
    this.setupWebSocket();
  }

  private setupMiddleware(): void {
    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: true }));

    // Logging middleware
    this.app.use((req, res, next) => {
      logger.info(`${req.method} ${req.path}`, { 
        query: req.query,
        body: req.body 
      });
      next();
    });
  }

  private setupRoutes(): void {
    // Health check
    this.app.get('/health', (req: Request, res: Response) => {
      res.json({ status: 'ok', timestamp: new Date().toISOString() });
    });

    // Voice webhook - called when Twilio connects to the call
    this.app.post('/api/voice', (req: Request, res: Response) => {
      try {
        const streamUrl = `wss://${req.get('host')}/media-stream`;
        const twiml = generateStreamTwiML({ streamUrl });
        
        logger.info('Voice webhook called', { 
          callSid: req.body.CallSid,
          from: req.body.From,
          to: req.body.To 
        });

        res.type('text/xml');
        res.send(twiml);
      } catch (error) {
        logger.error('Error in voice webhook', { error });
        res.status(500).send('Internal Server Error');
      }
    });

    // Status callback - called for call status updates
    this.app.post('/api/status', (req: Request, res: Response) => {
      logger.info('Status callback received', {
        callSid: req.body.CallSid,
        callStatus: req.body.CallStatus,
      });
      res.sendStatus(200);
    });

    // Get all leads
    this.app.get('/api/leads', async (req: Request, res: Response) => {
      try {
        const leads = await this.config.leadsStore.readAll();
        res.json({ leads, count: leads.length });
      } catch (error) {
        logger.error('Error fetching leads', { error });
        res.status(500).json({ error: 'Failed to fetch leads' });
      }
    });

    // Get single lead
    this.app.get('/api/leads/:id', async (req: Request, res: Response) => {
      try {
        const lead = await this.config.leadsStore.findById(req.params.id);
        if (!lead) {
          return res.status(404).json({ error: 'Lead not found' });
        }
        res.json(lead);
      } catch (error) {
        logger.error('Error fetching lead', { error });
        res.status(500).json({ error: 'Failed to fetch lead' });
      }
    });
  }

  private setupWebSocket(): void {
    this.wss.on('connection', async (ws: WebSocket, req) => {
      logger.info('WebSocket connection established');

      try {
        // Extract phone number from query params or use a default
        const url = new URL(req.url || '', `http://${req.headers.host}`);
        const phoneNumber = url.searchParams.get('phone') || 'unknown';

        // Create agent for this call
        const agent = new Agent(phoneNumber, {
          openaiApiKey: this.config.openaiApiKey,
          leadsStore: this.config.leadsStore,
        });

        await agent.initialize();
        this.agents.set(agent.getLead().id, agent);

        // Create media stream handler
        new MediaStreamHandler(ws, agent);

        ws.on('close', () => {
          this.agents.delete(agent.getLead().id);
        });
      } catch (error) {
        logger.error('Error setting up WebSocket connection', { error });
        ws.close();
      }
    });

    this.wss.on('error', (error) => {
      logger.error('WebSocket server error', { error });
    });
  }

  async start(): Promise<void> {
    return new Promise((resolve) => {
      this.server.listen(this.config.port, () => {
        logger.info(`Server listening on port ${this.config.port}`);
        resolve();
      });
    });
  }

  async stop(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.wss.close((err) => {
        if (err) {
          logger.error('Error closing WebSocket server', { error: err });
          return reject(err);
        }
        
        this.server.close((err) => {
          if (err) {
            logger.error('Error closing HTTP server', { error: err });
            return reject(err);
          }
          logger.info('Server stopped');
          resolve();
        });
      });
    });
  }
}
