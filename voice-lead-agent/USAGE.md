# Usage Guide

This guide provides step-by-step instructions for using the Voice Lead Agent.

## Quick Start

### 1. Setup Environment

First, ensure you have all prerequisites:
- Node.js 18 or higher
- A Twilio account with a phone number
- An OpenAI API key with Realtime API access
- ngrok (for local development)

### 2. Configure Environment Variables

Copy `.env.example` to `.env` and fill in your credentials:

```bash
cp .env.example .env
```

Edit `.env`:
```env
PORT=3000
NODE_ENV=development

# Get these from https://console.twilio.com
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_PHONE_NUMBER=+15551234567

# Get this from https://platform.openai.com/api-keys
OPENAI_API_KEY=sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Your public URL (ngrok URL for local dev)
PUBLIC_URL=https://abc123.ngrok.io

# Where to store lead data
LEADS_FILE=leads.jsonl
```

### 3. Install Dependencies

```bash
npm install
```

### 4. Start ngrok (for local development)

In a separate terminal:
```bash
ngrok http 3000
```

Copy the HTTPS URL provided by ngrok (e.g., `https://abc123.ngrok.io`) and update `PUBLIC_URL` in your `.env` file.

### 5. Start the Application

Development mode (with hot reload):
```bash
npm run dev
```

Or build and run in production mode:
```bash
npm run build
npm start
```

### 6. Verify the Server is Running

Open your browser or use curl:
```bash
curl https://your-ngrok-url.ngrok.io/health
```

You should see:
```json
{
  "status": "ok",
  "timestamp": "2024-01-08T12:00:00.000Z"
}
```

## Making an Outbound Call

### Option 1: Programmatically (Recommended for Production)

Edit `src/index.ts` and uncomment the outbound call code:

```typescript
const phoneNumber = '+15551234567'; // Replace with target phone number
const callSid = await outboundCaller.makeCall({
  to: phoneNumber,
  statusCallback: `${env.PUBLIC_URL}/api/status`,
});
logger.info(`Outbound call initiated`, { callSid, phoneNumber });
```

Restart the application, and it will make the call on startup.

### Option 2: Via Twilio Console (for testing)

1. Go to https://console.twilio.com/
2. Navigate to Phone Numbers → Manage → Active numbers
3. Click on your Twilio phone number
4. Under "Voice & Fax", set:
   - **A CALL COMES IN**: Webhook
   - **URL**: `https://your-ngrok-url.ngrok.io/api/voice`
   - **HTTP**: POST
5. Make a call to your Twilio number from your phone

### Option 3: Create a Custom Endpoint

Add this to `src/server/http.ts` in the `setupRoutes()` method:

```typescript
// Initiate outbound call via API
this.app.post('/api/call', async (req: Request, res: Response) => {
  try {
    const { phoneNumber } = req.body;
    if (!phoneNumber) {
      return res.status(400).json({ error: 'phoneNumber is required' });
    }

    const outboundCaller = new OutboundCaller();
    const callSid = await outboundCaller.makeCall({
      to: phoneNumber,
      statusCallback: `${process.env.PUBLIC_URL}/api/status`,
    });

    res.json({ success: true, callSid, phoneNumber });
  } catch (error) {
    logger.error('Error initiating call', { error });
    res.status(500).json({ error: 'Failed to initiate call' });
  }
});
```

Then make calls via API:
```bash
curl -X POST https://your-ngrok-url.ngrok.io/api/call \
  -H "Content-Type: application/json" \
  -d '{"phoneNumber": "+15551234567"}'
```

## How the Call Flow Works

1. **Call Initiated**: When a call is made (outbound) or received (inbound), Twilio sends a request to `/api/voice`
2. **TwiML Response**: The server responds with TwiML that connects the call to a WebSocket at `/media-stream`
3. **WebSocket Connection**: Twilio establishes a bidirectional media stream WebSocket connection
4. **Agent Created**: A new `Agent` instance is created for this call, which:
   - Initializes a state machine (starting at GREETING)
   - Connects to OpenAI Realtime API
   - Creates a lead record
5. **Audio Streaming**: 
   - Audio from the caller flows: Twilio → WebSocket → Agent → OpenAI
   - AI responses flow back: OpenAI → Agent → WebSocket → Twilio
6. **Conversation States**: The agent progresses through states:
   - GREETING: Introduces itself
   - QUALIFYING: Determines if lead is interested
   - GATHERING_INFO: Collects contact details
   - CLOSING: Wraps up the conversation
   - ENDED: Call complete
7. **Data Storage**: Lead information is saved to `leads.jsonl` file
8. **Call Ends**: When the call ends, the agent saves final data and disconnects

## Viewing Lead Data

### Get All Leads

```bash
curl https://your-ngrok-url.ngrok.io/api/leads
```

### Get a Specific Lead

```bash
curl https://your-ngrok-url.ngrok.io/api/leads/lead_1234567890_abc123
```

### View JSONL File Directly

```bash
cat leads.jsonl | jq
```

Each line contains a complete lead record in JSON format.

## Monitoring and Debugging

### View Logs

The application logs to console with timestamps and context:

```
[2024-01-08T12:00:00.000Z] [INFO] [Main] Starting Voice Lead Agent
[2024-01-08T12:00:01.000Z] [INFO] [HTTPServer] Server listening on port 3000
[2024-01-08T12:00:05.000Z] [INFO] [Agent] Agent created for lead
```

### Debug Mode

Set `NODE_ENV=development` in `.env` to see debug logs.

### Common Issues

**WebSocket not connecting:**
- Verify `PUBLIC_URL` in `.env` matches your ngrok URL
- Check ngrok is running and accessible
- Ensure your firewall allows WebSocket connections

**No audio in call:**
- Verify OpenAI API key is valid and has Realtime API access
- Check Twilio account is not in trial mode (trial accounts have limitations)
- Review audio format conversions in `audio.ts`

**Call fails immediately:**
- Check Twilio credentials in `.env`
- Verify phone number format (must be E.164: +1234567890)
- Check Twilio account balance

## Customization

### Modify AI Prompts

Edit `src/realtime/prompts.ts` to change:
- System instructions
- Greeting message
- Qualifying questions
- Closing message

### Change Voice

Edit `src/realtime/client.ts` and change the voice in `configureSession()`:

```typescript
voice: 'alloy', // Options: alloy, echo, fable, onyx, nova, shimmer
```

### Adjust State Transitions

Edit `src/agent/stateMachine.ts` to modify:
- Valid state transitions
- State progression logic

### Add Custom Lead Fields

Edit `src/agent/lead.schema.ts` to add new fields to the lead schema.

## Production Deployment

### Security Checklist

- [ ] Use HTTPS in production
- [ ] Never commit `.env` file
- [ ] Rotate API keys regularly
- [ ] Implement rate limiting
- [ ] Add authentication to API endpoints
- [ ] Set up monitoring and alerting
- [ ] Configure proper error handling
- [ ] Use environment-specific configurations

### Deployment Options

#### Heroku

```bash
heroku create your-app-name
heroku config:set TWILIO_ACCOUNT_SID=ACxxx...
heroku config:set TWILIO_AUTH_TOKEN=xxx...
# Set other environment variables
git push heroku main
```

#### Docker

Create `Dockerfile`:
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY . .
RUN npm run build
CMD ["npm", "start"]
```

Build and run:
```bash
docker build -t voice-lead-agent .
docker run -p 3000:3000 --env-file .env voice-lead-agent
```

#### AWS/GCP/Azure

Deploy as a containerized application or serverless function. Ensure:
1. Set environment variables via cloud provider's secrets management
2. Configure auto-scaling for high call volumes
3. Set up monitoring and logs aggregation
4. Configure CDN if serving static assets

## Support

For issues or questions:
1. Check the logs for error messages
2. Review the README.md for setup instructions
3. Verify all environment variables are set correctly
4. Test with a simple call first
5. Check Twilio and OpenAI dashboard for any issues
