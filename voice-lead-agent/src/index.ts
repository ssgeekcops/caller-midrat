import { env } from './config/env.js';
import { HTTPServer } from './server/http.js';
import { JSONLStore } from './storage/jsonl.store.js';
import { OutboundCaller } from './telephony/twilio/outbound.js';
import { createLogger } from './utils/logger.js';

const logger = createLogger('Main');

async function main() {
  try {
    logger.info('Starting Voice Lead Agent');
    logger.info(`Environment: ${env.NODE_ENV}`);
    logger.info(`Port: ${env.PORT}`);

    // Initialize storage
    const leadsStore = new JSONLStore(env.LEADS_FILE);
    logger.info(`Leads will be stored in: ${env.LEADS_FILE}`);

    // Create HTTP server
    const server = new HTTPServer({
      port: parseInt(env.PORT),
      openaiApiKey: env.OPENAI_API_KEY,
      leadsStore,
    });

    // Start server
    await server.start();

    logger.info('Voice Lead Agent started successfully');
    logger.info(`Public URL: ${env.PUBLIC_URL}`);
    logger.info(`Health check: ${env.PUBLIC_URL}/health`);

    // Initialize outbound caller (for making calls programmatically)
    // Note: outboundCaller is available for making calls when needed
    const _outboundCaller = new OutboundCaller();

    // Example: Make an outbound call (commented out)
    // To make a call, uncomment and provide a phone number:
    /*
    const phoneNumber = '+1234567890';
    const callSid = await outboundCaller.makeCall({
      to: phoneNumber,
      statusCallback: `${env.PUBLIC_URL}/api/status`,
    });
    logger.info(`Outbound call initiated`, { callSid, phoneNumber });
    */

    // Graceful shutdown
    const shutdown = async () => {
      logger.info('Shutting down...');
      await server.stop();
      process.exit(0);
    };

    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);

  } catch (error) {
    logger.error('Failed to start Voice Lead Agent', { error });
    process.exit(1);
  }
}

main();
