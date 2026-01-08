# Voice Lead Agent

An AI-powered voice agent for automated lead qualification using Twilio and OpenAI's Realtime API. This application makes outbound calls, qualifies leads through natural conversations, and stores lead data for follow-up.

## Features

- 🤖 **AI-Powered Conversations**: Uses OpenAI's Realtime API for natural, human-like conversations
- 📞 **Twilio Integration**: Makes and receives calls via Twilio's telephony platform
- 🎯 **Lead Qualification**: Automatically qualifies leads by asking relevant questions
- 💾 **Data Storage**: Stores lead information and conversation data in JSONL format
- 🔄 **State Machine**: Manages conversation flow through defined states
- 📊 **Real-time Audio Streaming**: Bidirectional audio streaming between Twilio and OpenAI

## Architecture

```
voice-lead-agent/
├── src/
│   ├── index.ts              # Main entry point
│   ├── config/
│   │   └── env.ts            # Environment configuration with validation
│   ├── server/
│   │   └── http.ts           # Express HTTP server with WebSocket support
│   ├── telephony/
│   │   └── twilio/
│   │       ├── outbound.ts   # Outbound call management
│   │       ├── twiml.ts      # TwiML generation
│   │       └── mediaStream.ws.ts  # WebSocket media stream handler
│   ├── realtime/
│   │   ├── client.ts         # OpenAI Realtime API client
│   │   ├── audio.ts          # Audio format conversion utilities
│   │   └── prompts.ts        # System prompts and conversation templates
│   ├── agent/
│   │   ├── agent.ts          # Core agent logic
│   │   ├── stateMachine.ts   # Conversation state management
│   │   └── lead.schema.ts    # Lead data schema and validation
│   ├── storage/
│   │   └── jsonl.store.ts    # JSONL storage for lead data
│   └── utils/
│       └── logger.ts         # Logging utility
```

## Prerequisites

- Node.js 18+ 
- npm or yarn
- Twilio account with phone number
- OpenAI API key with Realtime API access
- ngrok or similar tunneling service for local development

## Installation

1. Clone the repository:
```bash
cd voice-lead-agent
```

2. Install dependencies:
```bash
npm install
```

3. Create `.env` file from template:
```bash
cp .env.example .env
```

4. Configure your environment variables in `.env`:
```env
PORT=3000
NODE_ENV=development

TWILIO_ACCOUNT_SID=your_account_sid_here
TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_PHONE_NUMBER=+1234567890

OPENAI_API_KEY=your_openai_api_key_here

PUBLIC_URL=https://your-ngrok-url.ngrok.io
LEADS_FILE=leads.jsonl
```

## Usage

### Development Mode

Start the development server with hot reload:
```bash
npm run dev
```

### Production Mode

Build and run in production:
```bash
npm run build
npm start
```

### Making Outbound Calls

To make an outbound call, you can use the `OutboundCaller` class programmatically. Edit `src/index.ts` and uncomment the example code:

```typescript
const phoneNumber = '+1234567890';
const callSid = await outboundCaller.makeCall({
  to: phoneNumber,
  statusCallback: `${env.PUBLIC_URL}/api/status`,
});
```

## API Endpoints

### Health Check
```
GET /health
```
Returns server health status.

### Voice Webhook
```
POST /api/voice
```
Twilio webhook for incoming call handling. Returns TwiML to connect to media stream.

### Status Callback
```
POST /api/status
```
Receives call status updates from Twilio.

### Get All Leads
```
GET /api/leads
```
Returns all stored leads with their data.

### Get Single Lead
```
GET /api/leads/:id
```
Returns a specific lead by ID.

## WebSocket Endpoints

### Media Stream
```
WSS /media-stream
```
Handles bidirectional audio streaming between Twilio and OpenAI Realtime API.

## Conversation Flow

The agent follows a state machine with these states:

1. **GREETING**: Introduces itself and the purpose of the call
2. **QUALIFYING**: Asks questions to determine if lead is qualified
3. **GATHERING_INFO**: Collects contact information and project details
4. **CLOSING**: Wraps up the conversation and sets next steps
5. **ENDED**: Call completed

## Lead Data Schema

Each lead record contains:
- `id`: Unique identifier
- `phoneNumber`: Lead's phone number
- `name`: Lead's full name (optional)
- `email`: Lead's email address (optional)
- `company`: Lead's company (optional)
- `interested`: Whether lead is interested (optional)
- `budget`: Budget range (optional)
- `timeline`: Project timeline (optional)
- `notes`: Additional notes (optional)
- `callStartedAt`: Call start timestamp
- `callEndedAt`: Call end timestamp (optional)
- `callDuration`: Call duration in seconds (optional)
- `callStatus`: Current call status
- `conversationTranscript`: Array of conversation messages (optional)

## Development

### Linting
```bash
npm run lint
```

### Formatting
```bash
npm run format
```

### Build
```bash
npm run build
```

## Deployment

### Using ngrok for Local Development

1. Start ngrok:
```bash
ngrok http 3000
```

2. Update `PUBLIC_URL` in `.env` with your ngrok URL

3. Configure Twilio webhook URLs in your Twilio console to point to your ngrok URL

### Production Deployment

For production, deploy to a cloud provider (AWS, Google Cloud, Heroku, etc.) and ensure:

1. Environment variables are properly configured
2. Your server has a public HTTPS URL
3. Twilio webhooks point to your production URLs
4. OpenAI API keys are secured
5. JSONL files are backed up regularly

## Security Considerations

- Never commit `.env` file or API keys to version control
- Use environment variables for all sensitive configuration
- Implement rate limiting for API endpoints
- Validate and sanitize all user inputs
- Use HTTPS in production
- Regularly rotate API keys
- Monitor and log all calls and API usage

## Troubleshooting

### WebSocket Connection Issues
- Ensure your PUBLIC_URL is correct and accessible
- Check that ngrok is running and the URL matches
- Verify firewall settings allow WebSocket connections

### Audio Quality Issues
- Check Twilio account for any audio codec settings
- Verify network bandwidth is sufficient for real-time streaming
- Review OpenAI Realtime API settings

### Call Not Connecting
- Verify Twilio credentials are correct
- Check that phone numbers are in E.164 format
- Ensure webhook URLs are accessible from Twilio

## License

MIT

## Contributing

Contributions are welcome! Please open an issue or submit a pull request.
