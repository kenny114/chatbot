# Future Features Implementation Guide

## Phase 1.2: Job Queue with BullMQ + Redis

### Why This is Important
Currently, crawl jobs die when the server restarts. A job queue provides:
- Job persistence across server restarts
- Real-time progress tracking
- Automatic retries
- Better error handling
- Ability to scale with multiple workers

### Prerequisites
1. Redis installed locally or use a cloud provider (Redis Cloud, AWS ElastiCache)
2. Install dependencies:
```bash
npm install bullmq ioredis
npm install --save-dev @types/ioredis
```

### Implementation Steps

#### 1. Create Job Queue Service
Create `backend/src/services/jobQueueService.ts`:
```typescript
import { Queue, Worker, QueueEvents } from 'bullmq';
import Redis from 'ioredis';

const connection = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  maxRetriesPerRequest: null,
});

// Create crawl job queue
export const crawlQueue = new Queue('crawl-jobs', { connection });

// Job data interface
interface CrawlJobData {
  chatbotId: string;
  dataSourceId: string;
  url: string;
  maxPages?: number;
}

// Worker to process crawl jobs
const crawlWorker = new Worker<CrawlJobData>(
  'crawl-jobs',
  async (job) => {
    const { chatbotId, dataSourceId, url, maxPages } = job.data;

    // Update progress
    await job.updateProgress(10);

    // Perform crawl
    const pages = await crawlerService.crawlWebsite(url, maxPages);
    await job.updateProgress(50);

    // Process and store content
    // ... (existing logic from chatbotService.processUrlSource)

    await job.updateProgress(100);
    return { success: true, pagesProcessed: pages.length };
  },
  {
    connection,
    concurrency: 2, // Process 2 jobs at a time
  }
);

// Listen to events
const queueEvents = new QueueEvents('crawl-jobs', { connection });

queueEvents.on('progress', ({ jobId, data }) => {
  console.log(`Job ${jobId} progress: ${data}%`);
});

queueEvents.on('completed', ({ jobId, returnvalue }) => {
  console.log(`Job ${jobId} completed:`, returnvalue);
});

queueEvents.on('failed', ({ jobId, failedReason }) => {
  console.error(`Job ${jobId} failed:`, failedReason);
});
```

#### 2. Update ChatbotService
Replace direct crawl calls with queue jobs:
```typescript
// In chatbotService.ts
import { crawlQueue } from './jobQueueService';

async addUrlSource(chatbotId: string, url: string): Promise<DataSource> {
  // Create data source record
  const dataSource = await supabaseAdmin
    .from('data_sources')
    .insert({ chatbot_id: chatbotId, type: 'url', source_url: url, status: 'processing' })
    .select()
    .single();

  // Add job to queue
  await crawlQueue.add('crawl-url', {
    chatbotId,
    dataSourceId: dataSource.id,
    url,
    maxPages: 50,
  }, {
    attempts: 3, // Retry up to 3 times
    backoff: { type: 'exponential', delay: 5000 },
  });

  return dataSource;
}
```

#### 3. Add Progress Endpoint
Create `backend/src/controllers/jobController.ts`:
```typescript
export const getJobProgress = async (req: Request, res: Response) => {
  const { jobId } = req.params;

  const job = await crawlQueue.getJob(jobId);
  if (!job) {
    return res.status(404).json({ error: 'Job not found' });
  }

  const state = await job.getState();
  const progress = job.progress;

  res.json({ jobId, state, progress });
};
```

#### 4. Environment Variables
Add to `.env`:
```
REDIS_HOST=localhost
REDIS_PORT=6379
```

### Testing
```bash
# Start Redis
redis-server

# Run backend
npm run dev
```

---

## Phase 2.4: Conversation Memory

### Why This is Important
Enable multi-turn conversations where the chatbot remembers previous messages in the conversation.

### Database Schema
Add conversation table:
```sql
CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  chatbot_id UUID NOT NULL REFERENCES chatbots(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE conversation_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX idx_conversations_chatbot_session ON conversations(chatbot_id, session_id);
CREATE INDEX idx_conversation_messages_conversation ON conversation_messages(conversation_id);
```

### Implementation
Update `ragService.ts`:
```typescript
async generateResponse(
  chatbotId: string,
  userMessage: string,
  chatbotInstructions: string = '',
  sessionId?: string
): Promise<{ response: string; sources: string[]; conversationId: string }> {
  // Get or create conversation
  let conversation;
  if (sessionId) {
    conversation = await this.getOrCreateConversation(chatbotId, sessionId);
  }

  // Retrieve context from RAG
  const context = await this.retrieveContext(chatbotId, userMessage);

  // Get conversation history (last 10 messages)
  const history = conversation
    ? await this.getConversationHistory(conversation.id, 10)
    : [];

  // Build messages array with history
  const messages = [
    { role: 'system', content: systemPrompt },
    ...history,
    { role: 'user', content: userMessage },
  ];

  // Generate response
  const completion = await openai.chat.completions.create({
    model: CHAT_MODEL,
    messages,
    temperature: 0.7,
  });

  const response = completion.choices[0].message.content;

  // Store conversation
  if (conversation) {
    await this.storeMessage(conversation.id, 'user', userMessage);
    await this.storeMessage(conversation.id, 'assistant', response);
  }

  return {
    response,
    sources,
    conversationId: conversation?.id || '',
  };
}
```

---

## Phase 2.1: Real-time Progress Updates

### Option 1: WebSockets with Socket.IO
```bash
npm install socket.io socket.io-client
```

Backend:
```typescript
import { Server } from 'socket.io';

// In index.ts
const io = new Server(server, { cors: { origin: '*' } });

io.on('connection', (socket) => {
  console.log('Client connected');

  socket.on('subscribe-crawl', (dataSourceId) => {
    socket.join(`crawl-${dataSourceId}`);
  });
});

// In job queue worker
await job.updateProgress(percent);
io.to(`crawl-${dataSourceId}`).emit('crawl-progress', {
  dataSourceId,
  progress: percent,
  message: `Crawled page ${current} of ${total}`,
});
```

Frontend:
```typescript
import { io } from 'socket.io-client';

const socket = io('http://localhost:3001');

socket.emit('subscribe-crawl', dataSourceId);
socket.on('crawl-progress', (data) => {
  console.log(data); // { progress: 50, message: "Crawled page 5 of 10" }
});
```

### Option 2: Server-Sent Events (Simpler)
Backend endpoint:
```typescript
app.get('/api/crawl/:id/stream', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  const interval = setInterval(async () => {
    const progress = await getCrawlProgress(req.params.id);
    res.write(`data: ${JSON.stringify(progress)}\n\n`);

    if (progress.status === 'completed') {
      clearInterval(interval);
      res.end();
    }
  }, 1000);
});
```

Frontend:
```typescript
const eventSource = new EventSource(`/api/crawl/${id}/stream`);
eventSource.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log(data);
};
```

---

## Phase 2.3: Content Viewer (Already Implemented Below!)

See implementation in the code.

---

## Additional Recommendations

### API Documentation with Swagger
```bash
npm install swagger-ui-express swagger-jsdoc
```

### Logging with Winston
```bash
npm install winston
```

### Docker Setup
Create `docker-compose.yml`:
```yaml
version: '3.8'
services:
  redis:
    image: redis:7
    ports:
      - "6379:6379"

  postgres:
    image: postgres:15
    environment:
      POSTGRES_PASSWORD: postgres
    ports:
      - "5432:5432"
```

### CI/CD with GitHub Actions
Create `.github/workflows/ci.yml` for automated testing and deployment.
