# AI Chatbot Platform

A full-stack application that allows companies to create custom AI chatbots trained on their own data. Users can provide data via website URLs (with Apify crawling) or manual text input, and deploy chatbots that can be embedded on any website.

## Features

- **User Authentication** - Secure registration and login with JWT tokens
- **Chatbot Creation** - Create multiple chatbots with custom instructions
- **Data Sources**:
  - URL crawling using Apify (automatically extracts content from websites)
  - Manual text input for custom company information
- **RAG (Retrieval Augmented Generation)** - Chatbots respond based on actual company data
- **Embeddable Widget** - Easy integration with any website via webhook
- **Real-time Status** - Track data processing progress
- **Source Citations** - Chatbot responses include source references

## Tech Stack

### Backend
- Node.js + Express + TypeScript
- Supabase (PostgreSQL with pgvector for embeddings)
- OpenAI API (for embeddings and chat completions)
- Apify (for web crawling)

### Frontend
- React + TypeScript
- Vite
- React Router
- Axios

## Prerequisites

Before you begin, ensure you have:

- Node.js 18+ installed
- npm or yarn package manager
- Supabase account ([sign up free](https://supabase.com))
- OpenAI API key ([get one here](https://platform.openai.com/api-keys))
- Apify API token ([sign up free](https://apify.com))

## Setup Instructions

### 1. Clone and Install Dependencies

```bash
cd chatbot
npm install
cd backend && npm install
cd ../frontend && npm install
cd ..
```

### 2. Set Up Supabase Database

1. Create a new project in [Supabase](https://supabase.com)
2. Go to the SQL Editor
3. Run the SQL script from `database/schema.sql` to create all tables and indexes
4. Enable the `vector` extension:
   - Go to Database → Extensions
   - Search for "vector" and enable it
5. Get your connection details from Settings → API

### 3. Configure Environment Variables

Create a `.env` file in the `backend` directory:

```bash
cp .env.example backend/.env
```

Edit `backend/.env` and fill in your credentials:

```env
# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_KEY=your_service_role_key

# Apify
APIFY_API_TOKEN=your_apify_token

# OpenAI
OPENAI_API_KEY=sk-your-openai-api-key

# JWT Secret (generate a random string)
JWT_SECRET=your_random_secret_key_minimum_32_characters

# Server
PORT=3001
NODE_ENV=development
FRONTEND_URL=http://localhost:5173

# CORS
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000
```

### 4. Start the Application

**Development Mode** (both frontend and backend):

```bash
npm run dev
```

Or start them separately:

**Backend:**
```bash
cd backend
npm run dev
```

**Frontend:**
```bash
cd frontend
npm run dev
```

The app will be available at:
- Frontend: http://localhost:5173
- Backend: http://localhost:3001

## Usage Guide

### 1. Create an Account

1. Navigate to http://localhost:5173
2. Click "Register" and create your account
3. Login with your credentials

### 2. Create a Chatbot

1. Click "Create New Chatbot"
2. Enter:
   - **Name**: e.g., "Customer Support Bot"
   - **Description**: Brief description of the chatbot
   - **Instructions**: Custom behavior instructions (optional)
3. Click "Create Chatbot"

### 3. Add Data Sources

**Option A: Website URL**
1. Click "Add Data Source"
2. Select "Website URL"
3. Enter your company website URL
4. The crawler will automatically extract content from the site
5. Wait for processing to complete (status will change to "ready")

**Option B: Manual Text**
1. Click "Add Data Source"
2. Select "Manual Text"
3. Paste your company information, FAQs, product details, etc.
4. Click "Add Source"

### 4. Test the Chatbot

1. Once the status is "ready", click "Test Chatbot"
2. Ask questions about your company data
3. The chatbot will respond based on the information provided

### 5. Embed on Your Website

1. Copy the webhook URL or embed code
2. Add it to your website
3. Users can now interact with your chatbot!

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login

### Chatbots
- `POST /api/chatbots` - Create chatbot
- `GET /api/chatbots` - List user's chatbots
- `GET /api/chatbots/:id` - Get chatbot details
- `DELETE /api/chatbots/:id` - Delete chatbot
- `POST /api/chatbots/:id/sources/url` - Add URL source
- `POST /api/chatbots/:id/sources/text` - Add text source
- `GET /api/chatbots/:id/sources` - Get data sources
- `GET /api/chatbots/:id/status` - Get processing status

### Webhooks (Public)
- `POST /api/webhooks/:chatbotId/query` - Send message to chatbot

## Project Structure

```
chatbot/
├── backend/
│   ├── src/
│   │   ├── config/         # Database and API configurations
│   │   ├── controllers/    # Request handlers
│   │   ├── middleware/     # Auth, error handling, rate limiting
│   │   ├── routes/         # API route definitions
│   │   ├── services/       # Business logic (crawler, RAG, embeddings)
│   │   ├── types/          # TypeScript type definitions
│   │   ├── utils/          # Validation and utilities
│   │   └── index.ts        # App entry point
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/     # React components
│   │   ├── pages/          # Page components
│   │   ├── services/       # API client
│   │   ├── hooks/          # Custom React hooks
│   │   ├── types/          # TypeScript types
│   │   ├── styles/         # CSS styles
│   │   └── main.tsx        # App entry point
│   └── package.json
├── database/
│   └── schema.sql          # Database schema
├── tasks/
│   └── todo.md             # Project plan and todos
└── README.md
```

## How It Works

### 1. Data Ingestion
- **URL Crawling**: Apify crawls the website and extracts text content
- **Text Processing**: Content is cleaned and chunked into manageable pieces
- **Embedding Generation**: Each chunk is converted to a vector embedding using OpenAI

### 2. Storage
- Text chunks and embeddings are stored in Supabase (PostgreSQL + pgvector)
- pgvector enables efficient similarity search

### 3. RAG (Retrieval Augmented Generation)
When a user asks a question:
1. Question is converted to an embedding
2. Most similar chunks are retrieved using vector search
3. Retrieved context + question are sent to OpenAI GPT-4
4. AI generates response based on actual company data
5. Sources are cited in the response

### 4. Embedding
- Webhook URL provided for each chatbot
- Can be called from any website or application
- Returns AI-generated responses with source citations

## Security Features

- Password hashing with bcrypt
- JWT token authentication
- Input validation and sanitization
- Rate limiting on all endpoints
- CORS configuration
- SQL injection prevention
- XSS protection
- Row-level security in Supabase

## Troubleshooting

### "Missing environment variables" error
- Ensure all variables in `.env` are set
- Check that `.env` is in the `backend` directory

### Database connection errors
- Verify Supabase credentials
- Ensure pgvector extension is enabled
- Check that schema.sql was executed successfully

### Crawler not working
- Verify Apify API token is correct
- Check Apify account has sufficient credits
- Some websites may block crawlers (robots.txt)

### OpenAI API errors
- Verify API key is correct
- Check your OpenAI account has credits
- Ensure you're not hitting rate limits

## Development

### Build for Production

**Backend:**
```bash
cd backend
npm run build
npm start
```

**Frontend:**
```bash
cd frontend
npm run build
npm run preview
```

### Testing

```bash
cd backend
npm test
```

## Future Enhancements

- Conversation history tracking
- Analytics dashboard
- Multi-language support
- Custom branding options
- Voice input/output
- Integration with CRM systems
- Usage metrics and quotas
- A/B testing for responses
- Advanced admin controls

## License

MIT

## Support

For issues or questions, please open an issue on GitHub.

---

Built with Claude Code
