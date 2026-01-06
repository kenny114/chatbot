# Task: AI Chatbot Generation Platform

## Analysis

### Current State
- Empty project directory (new project)
- No existing codebase
- Development guidelines established in `claudefollowthese.md`

### Problem/Goal
Create a platform that allows companies to:
1. Generate custom AI chatbots trained on their company data
2. Provide data through two sources:
   - Website URL crawling
   - Manual text input with custom instructions
3. Deploy chatbots that can be embedded in websites via webhook URL
4. Answer user questions based on trained company information

### Constraints
- Must handle web crawling safely and efficiently
- Need to store and process company data securely
- Must provide embeddable chatbot interface
- Should support multiple companies/chatbots (multi-tenant)
- API keys and credentials must be environment variables
- Must handle errors gracefully (crawling failures, API limits, etc.)

## Approach

### High-Level Architecture

**Tech Stack Recommendation:**
- **Backend**: Node.js with Express.js (or Python with FastAPI)
- **Frontend**: React.js with TypeScript
- **Database**: PostgreSQL (structured data) + Vector Database (Pinecone/Weaviate for embeddings)
- **AI/LLM**: OpenAI API (GPT-4) or Anthropic Claude API
- **Web Crawler**: Puppeteer/Playwright (Node.js) or BeautifulSoup/Scrapy (Python)
- **Embeddings**: OpenAI Embeddings API or open-source alternatives
- **Hosting**: Cloud platform (AWS/GCP/Azure) or Vercel/Railway

**Key Components:**
1. **Admin Dashboard** - Chatbot creation interface
2. **Data Ingestion Service** - Handles URL crawling and manual text input
3. **Data Processing Pipeline** - Converts data to embeddings, stores in vector DB
4. **Chatbot API** - Webhook endpoints for chatbot interactions
5. **Embedding Widget** - JavaScript snippet for website integration
6. **RAG (Retrieval Augmented Generation) Engine** - Queries relevant data and generates responses

### System Flow

```
1. User creates chatbot account
2. User provides company data:
   a. URL → Crawler → Extract content → Process
   b. Manual text → Direct processing
3. Data Processing:
   - Clean and chunk text
   - Generate embeddings
   - Store in vector database
4. Chatbot Generation:
   - Create unique chatbot ID
   - Generate webhook URL
   - Generate embed code
5. End-user interaction:
   - User asks question via embed widget
   - Webhook receives query
   - RAG retrieves relevant context
   - LLM generates response
   - Response returned to widget
```

### Key Decisions and Rationale

**1. Vector Database for Retrieval:**
- **Why**: Enables semantic search over company data
- **Benefit**: Returns most relevant context for each query
- **Options**: Pinecone (managed), Weaviate (self-hosted), or pgvector (PostgreSQL extension)

**2. RAG Architecture:**
- **Why**: More accurate than fine-tuning, easier to update, cost-effective
- **Benefit**: Chatbot responds based on actual company data, not hallucinations

**3. Multi-tenant Database Design:**
- **Why**: Each company's data must be isolated
- **Benefit**: Security, scalability, easy management

**4. Webhook-based API:**
- **Why**: Decoupled architecture, easy to embed anywhere
- **Benefit**: Works with any website, simple integration

### Alternative Approaches Considered

**Fine-tuning vs RAG:**
- ❌ Fine-tuning: Expensive, hard to update, requires retraining
- ✅ RAG: Flexible, updatable, cost-effective

**Monolithic vs Microservices:**
- ✅ Monolithic (MVP): Simpler, faster development
- Future: Can split into microservices as needed

**Sync vs Async Crawling:**
- ✅ Async with job queue: Better UX, handles large sites
- Shows progress to user

## Todo Items

### Phase 1: Project Setup & Infrastructure
- [ ] Initialize project with Git repository
- [ ] Set up project structure (frontend, backend, database folders)
- [ ] Configure TypeScript/Node.js for backend (or Python environment)
- [ ] Set up React.js frontend with TypeScript
- [ ] Create `.env.example` file for environment variables
- [ ] Install core dependencies (Express, database clients, etc.)
- [ ] Set up ESLint and Prettier for code formatting
- [ ] Create basic README.md with project overview

**Acceptance Criteria:**
- Project structure follows modular architecture
- All dependencies documented
- Environment variables template created
- Code quality tools configured

### Phase 2: Database Schema Design
- [ ] Design PostgreSQL schema for:
  - Users/Companies table
  - Chatbots table (one company can have multiple chatbots)
  - Data sources table (URLs, manual texts)
  - Conversations table (for analytics)
- [ ] Design vector database collections structure
- [ ] Create database migration files
- [ ] Implement database connection with error handling
- [ ] Add database seed data for testing

**Acceptance Criteria:**
- Schema supports multi-tenant architecture
- Proper indexes for performance
- Foreign keys and constraints defined
- Migration scripts tested

### Phase 3: Web Crawler Implementation
- [ ] Implement URL validation and sanitization
- [ ] Create web crawler using Puppeteer/Playwright:
  - Respect robots.txt
  - Handle JavaScript-rendered content
  - Extract main content (remove nav, footer, ads)
  - Handle pagination and internal links
  - Implement crawl depth limits
  - Add timeout handling
- [ ] Implement crawl job queue (Bull/BullMQ or Celery)
- [ ] Create progress tracking mechanism
- [ ] Add error handling for failed pages
- [ ] Implement rate limiting to avoid overwhelming target sites
- [ ] Store crawled content in database

**Acceptance Criteria:**
- Successfully crawls multi-page websites
- Handles errors gracefully (404s, timeouts)
- Respects crawl limits
- Provides progress updates
- Tested with 5+ different website structures

### Phase 4: Data Processing Pipeline
- [ ] Implement text cleaning and preprocessing:
  - Remove HTML tags
  - Remove excessive whitespace
  - Handle special characters
- [ ] Create text chunking strategy (maintain context):
  - Chunk size: ~500-1000 tokens
  - Overlap: ~100 tokens
  - Preserve sentence boundaries
- [ ] Integrate embeddings API (OpenAI or alternative)
- [ ] Implement batch processing for large datasets
- [ ] Store embeddings in vector database with metadata
- [ ] Create manual text input processing
- [ ] Add duplicate content detection

**Acceptance Criteria:**
- Text properly chunked without cutting sentences
- Embeddings generated successfully
- Handles large documents (100+ pages)
- Metadata preserved for retrieval
- Processing time logged

### Phase 5: Backend API Development
- [ ] Create authentication system:
  - User registration
  - Login/logout
  - JWT token management
  - Password hashing (bcrypt)
- [ ] Implement API endpoints:
  - `POST /api/chatbots` - Create new chatbot
  - `POST /api/chatbots/:id/sources/url` - Add URL data source
  - `POST /api/chatbots/:id/sources/text` - Add manual text
  - `GET /api/chatbots/:id/status` - Check processing status
  - `GET /api/chatbots/:id/webhook-url` - Get webhook URL
  - `POST /api/webhooks/:chatbot_id/query` - Chat endpoint (public)
  - `GET /api/chatbots` - List user's chatbots
  - `DELETE /api/chatbots/:id` - Delete chatbot
- [ ] Implement input validation for all endpoints
- [ ] Add rate limiting middleware
- [ ] Implement CORS configuration
- [ ] Create error handling middleware
- [ ] Add request logging

**Acceptance Criteria:**
- All endpoints secured with authentication (except webhook)
- Input validation prevents injection attacks
- Proper HTTP status codes returned
- API documented with examples
- Rate limiting prevents abuse

### Phase 6: RAG Implementation
- [ ] Create vector similarity search function:
  - Query embeddings generation
  - Retrieve top-k most relevant chunks (k=3-5)
  - Relevance scoring threshold
- [ ] Implement context assembly:
  - Combine retrieved chunks
  - Add metadata (source URL, date)
  - Format for LLM prompt
- [ ] Create LLM integration (OpenAI/Anthropic):
  - System prompt engineering
  - Context injection
  - Temperature and parameter tuning
  - Response streaming (optional)
- [ ] Implement conversation context handling (optional):
  - Store last N messages
  - Include in prompt for continuity
- [ ] Add fallback responses for low-confidence queries
- [ ] Implement response caching for common queries

**Acceptance Criteria:**
- Retrieves relevant context for queries
- LLM generates accurate responses
- Sources cited in responses
- Handles "I don't know" gracefully
- Response time < 3 seconds

### Phase 7: Frontend - Admin Dashboard
- [ ] Create login/registration pages
- [ ] Build dashboard home page (list of chatbots)
- [ ] Create chatbot creation wizard:
  - Step 1: Basic info (name, description)
  - Step 2: Data sources (URL input + manual text area)
  - Step 3: Chatbot behavior instructions
  - Step 4: Review and create
- [ ] Implement URL crawler interface:
  - Input field with validation
  - Start crawl button
  - Progress indicator
  - Success/error notifications
- [ ] Create manual text input interface:
  - Rich text editor (or simple textarea)
  - Character/token counter
  - Save functionality
- [ ] Build chatbot management page:
  - Edit data sources
  - View processing status
  - Test chatbot
  - Get embed code
  - View webhook URL
  - Delete chatbot
- [ ] Add chatbot testing interface (chat UI in dashboard)
- [ ] Implement error handling and loading states
- [ ] Add responsive design for mobile

**Acceptance Criteria:**
- Intuitive user flow
- Real-time status updates
- Clear error messages
- Mobile-friendly
- Accessible (WCAG guidelines)

### Phase 8: Embeddable Chat Widget
- [ ] Create chat widget UI component:
  - Floating chat button
  - Expandable chat window
  - Message list
  - Input field
  - Typing indicator
  - Branding (company name/logo)
- [ ] Implement widget JavaScript SDK:
  - Initialize with chatbot ID
  - Connect to webhook API
  - Send/receive messages
  - Handle connection errors
- [ ] Add customization options:
  - Position (bottom-right, bottom-left)
  - Theme colors
  - Welcome message
  - Avatar
- [ ] Create embed code generator
- [ ] Implement CORS for widget domains
- [ ] Add widget usage analytics (optional)
- [ ] Minify and bundle widget code

**Acceptance Criteria:**
- Widget loads on any website
- Responsive design
- Works across browsers (Chrome, Firefox, Safari, Edge)
- No conflicts with host website
- < 50KB bundle size

### Phase 9: Testing
- [ ] Write unit tests for:
  - API endpoints (80%+ coverage)
  - Data processing functions
  - RAG retrieval logic
  - Authentication
- [ ] Write integration tests for:
  - Chatbot creation flow
  - Web crawling
  - Query processing
  - Webhook interactions
- [ ] Test edge cases:
  - Invalid URLs
  - Very large websites (100+ pages)
  - Empty/malformed data
  - Concurrent users
  - API rate limits
- [ ] Security testing:
  - SQL injection attempts
  - XSS attacks
  - CSRF protection
  - Authentication bypass
- [ ] Performance testing:
  - Load testing (concurrent requests)
  - Database query optimization
  - Vector search speed
- [ ] Manual testing:
  - Create 3+ test chatbots
  - Test embed on different websites
  - Mobile device testing

**Acceptance Criteria:**
- All tests passing
- 80%+ code coverage
- No critical security vulnerabilities
- Performance benchmarks met
- Bug tracking system set up

### Phase 10: Documentation
- [ ] Write API documentation:
  - Endpoint descriptions
  - Request/response examples
  - Authentication guide
  - Error codes
- [ ] Create user guide:
  - How to create a chatbot
  - How to add data sources
  - How to embed widget
  - Best practices
- [ ] Write developer documentation:
  - Architecture overview
  - Database schema
  - Environment variables
  - Deployment guide
- [ ] Create README.md:
  - Project description
  - Setup instructions
  - Tech stack
  - Contributing guidelines
- [ ] Add inline code comments for complex logic
- [ ] Create changelog.md

**Acceptance Criteria:**
- Non-technical users can create chatbot
- Developers can set up locally
- API fully documented
- Architecture decisions explained

### Phase 11: Deployment & DevOps
- [ ] Set up production database (PostgreSQL + Vector DB)
- [ ] Configure environment variables for production
- [ ] Set up CI/CD pipeline:
  - Automated testing
  - Build process
  - Deployment automation
- [ ] Deploy backend to cloud platform
- [ ] Deploy frontend to CDN/hosting
- [ ] Configure custom domain and SSL
- [ ] Set up monitoring and logging:
  - Error tracking (Sentry)
  - Performance monitoring
  - Database monitoring
- [ ] Implement backup strategy
- [ ] Create deployment documentation
- [ ] Set up staging environment

**Acceptance Criteria:**
- Application accessible via HTTPS
- Automated deployments working
- Monitoring alerts configured
- Backups scheduled
- Zero-downtime deployment strategy

### Phase 12: Advanced Features (Optional/Future)
- [ ] Multi-language support
- [ ] Conversation history for users
- [ ] Analytics dashboard (query volume, popular topics)
- [ ] A/B testing for responses
- [ ] Custom branding (whitelabel)
- [ ] API access for enterprise customers
- [ ] Export conversation data
- [ ] Chatbot personality customization
- [ ] Integration with CRM systems
- [ ] Voice input/output support

## Testing Plan

### Unit Tests Coverage
- **Authentication**: Registration, login, JWT validation
- **URL Validation**: Valid URLs, invalid URLs, malicious URLs
- **Text Processing**: Chunking, cleaning, edge cases (empty, very long)
- **Vector Search**: Similarity matching, threshold filtering
- **API Endpoints**: All request/response scenarios

### Integration Tests
- **End-to-End Chatbot Creation**:
  1. Create account
  2. Create chatbot
  3. Add URL data source
  4. Wait for processing
  5. Query chatbot
  6. Verify response
- **Crawling Workflow**:
  - Test with simple static site
  - Test with JavaScript-heavy site
  - Test with large site (pagination)
  - Test with invalid URLs
- **Widget Embedding**:
  - Embed on test website
  - Send messages
  - Verify responses

### Edge Cases to Cover
- **Empty data scenarios**:
  - No data sources provided
  - Empty text input
  - Website with no text content
- **Large data scenarios**:
  - Website with 500+ pages
  - Single text input > 50,000 tokens
  - Multiple concurrent crawls
- **Error scenarios**:
  - Website timeout
  - API rate limit reached
  - Database connection failure
  - Invalid chatbot ID in webhook
- **Security scenarios**:
  - SQL injection in text input
  - XSS in manual text
  - Unauthorized API access
  - CSRF attacks

### Performance Benchmarks
- Query response time: < 3 seconds (95th percentile)
- Crawl throughput: 5+ pages/second
- Vector search: < 500ms
- API endpoint response: < 200ms (excluding LLM)
- Concurrent users: Support 100+ simultaneous chats

## Risks & Considerations

### Technical Risks
1. **Rate Limiting**:
   - **Risk**: OpenAI/Anthropic API rate limits
   - **Mitigation**: Implement request queuing, caching, alternative providers

2. **Crawling Limitations**:
   - **Risk**: Some websites block crawlers or use anti-bot measures
   - **Mitigation**: Use headless browser, rotate user agents, add manual upload option

3. **Vector Database Costs**:
   - **Risk**: Managed vector DB (Pinecone) can be expensive at scale
   - **Mitigation**: Start with pgvector (open-source), migrate if needed

4. **LLM Hallucinations**:
   - **Risk**: Model generates incorrect information
   - **Mitigation**: Strong RAG implementation, cite sources, confidence scoring

### Security Risks
1. **Data Privacy**:
   - **Risk**: Storing sensitive company information
   - **Mitigation**: Encryption at rest, compliance (GDPR), user data controls

2. **Webhook Abuse**:
   - **Risk**: Public webhooks can be spammed
   - **Mitigation**: Rate limiting, CAPTCHA, authentication tokens

3. **XSS via Widget**:
   - **Risk**: Malicious chatbot responses injected into host website
   - **Mitigation**: Sanitize all LLM outputs, CSP headers

### Business Risks
1. **API Costs**:
   - **Risk**: LLM API costs can scale quickly
   - **Mitigation**: Usage limits per plan, caching, optimize prompts

2. **Scaling Challenges**:
   - **Risk**: Database and vector search performance at scale
   - **Mitigation**: Proper indexing, caching, horizontal scaling strategy

### Breaking Changes
- None for MVP (new project)
- Future versioning for API: `/api/v1/`, `/api/v2/`

## Development Timeline Estimate

**MVP Development Phases** (approximate complexity, not time):
- Phase 1-2: Foundation (10% of work)
- Phase 3-4: Data Pipeline (25% of work)
- Phase 5-6: Core Features (30% of work)
- Phase 7-8: Frontend & Widget (20% of work)
- Phase 9-10: Testing & Docs (10% of work)
- Phase 11: Deployment (5% of work)

**Suggested Approach**: Build iteratively, test continuously, deploy early

## Success Metrics

### MVP Launch Criteria
- [ ] User can create account and chatbot
- [ ] Chatbot can ingest data from URLs and manual text
- [ ] Chatbot responds accurately to queries
- [ ] Widget embeds successfully on test websites
- [ ] All core tests passing
- [ ] Documentation complete

### Post-Launch Metrics
- User registration rate
- Chatbots created per user
- Average response accuracy (user feedback)
- Query volume per chatbot
- Widget embed adoption
- API error rates
- Average response time

## Next Steps

1. **Get approval on this plan**
2. **Clarify technology preferences** (Node.js vs Python, specific databases)
3. **Set up development environment**
4. **Start with Phase 1 implementation**

---

## Notes & Decisions

### Technology Stack Decision Needed
**Question for User**: Which technology stack do you prefer?

**Option A: Node.js Stack**
- Backend: Node.js + Express + TypeScript
- Pros: Single language (JavaScript/TypeScript), great async handling, large ecosystem
- Cons: Less robust for CPU-intensive tasks

**Option B: Python Stack**
- Backend: Python + FastAPI
- Pros: Better ML/AI libraries, cleaner syntax, strong typing with Pydantic
- Cons: Slower than Node.js for I/O operations

**My Recommendation**: Node.js for rapid development and unified language, unless you have Python expertise or specific ML requirements.

### Vector Database Decision Needed
**Options**:
1. **pgvector** (PostgreSQL extension): Free, simple, good for MVP
2. **Pinecone**: Managed, scalable, but costs $$
3. **Weaviate**: Self-hosted, feature-rich, more complex

**My Recommendation**: Start with pgvector for MVP, migrate to Pinecone if scaling needs arise.

### LLM Provider Decision Needed
**Options**:
1. **OpenAI (GPT-4)**: Best quality, higher cost
2. **Anthropic (Claude)**: Great quality, competitive pricing
3. **Open-source (Llama)**: Free, but requires hosting

**My Recommendation**: OpenAI or Anthropic for reliability and quality. Can add open-source option later.
