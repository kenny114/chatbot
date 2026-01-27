# Important Things to Know 📝

This file contains critical information about the chatbot system that you should reference regularly.

---

## 🔴 Shadow Mode vs A/B Testing - DO NOT MIX!

### Shadow Mode (Phase 2) - Safe Testing
**Purpose**: Test agent without ANY user impact

**How it works:**
- Runs agent AND state machine in PARALLEL
- Users ALWAYS see state machine response
- Agent runs silently in background for comparison
- Zero risk to users

**Configuration:**
```bash
AGENT_SHADOW_MODE=true
USE_LANGCHAIN_AGENT=false  # Keep false!
SHADOW_MODE_CHATBOTS=chatbot-id-1,chatbot-id-2  # Optional
```

**View results:**
```bash
cd backend && node view-shadow-mode.js
```

**When to use:**
- Initial agent testing
- Prompt tuning
- Validating agent behavior
- Before production rollout

---

### A/B Testing (Phase 3) - Production Rollout
**Purpose**: Gradually roll out agent to real users

**How it works:**
- Routes X% of chatbots to agent
- Routes rest to state machine
- Users see EITHER agent OR state machine (not both)
- Tracks comparative metrics

**Configuration:**
```bash
AGENT_SHADOW_MODE=false  # Must be false!
USE_LANGCHAIN_AGENT=true
AGENT_ROLLOUT_PERCENTAGE=10  # 10% agent, 90% control
```

**View results:**
```bash
cd backend && node view-ab-test.js
```

**When to use:**
- After shadow mode validation (80%+ alignment)
- Gradual production rollout: 10% → 25% → 50% → 100%
- Measuring real impact on lead capture

---

### ⚠️ Critical Rules

| Feature | Shadow Mode | A/B Testing | Never Mix! |
|---------|-------------|-------------|------------|
| `AGENT_SHADOW_MODE` | ✅ `true` | ❌ `false` | Both true = broken |
| `USE_LANGCHAIN_AGENT` | ❌ `false` | ✅ `true` | Both true = broken |
| User sees | State machine only | Agent OR state machine | - |
| Risk level | Zero | Low (controlled) | - |

**Never have both enabled at the same time!**

---

## 🚦 Recommended Testing Flow

```
1. Shadow Mode (1 week)
   └─> 50-100 conversations
   └─> Check alignment score: target 80%+
   └─> Tune agent prompts if needed
        ↓
2. A/B Testing: 10% (3-5 days)
   └─> Monitor metrics daily
   └─> Check for +15% lead capture improvement
        ↓
3. A/B Testing: 25% (3-5 days)
   └─> Verify statistical significance
        ↓
4. A/B Testing: 50% (5-7 days)
   └─> Ensure error rate <3%
        ↓
5. A/B Testing: 100% (Full rollout)
   └─> Monitor for 1 week
        ↓
6. Remove state machine code (Phase 4)
```

---

## 📊 Key Metrics Reference

### Shadow Mode Metrics
- **Decision Alignment Score**: Target 80%+ (50pts mode + 25pts intent + 25pts response)
- **Mode Match Rate**: Target 85%+
- **Error Rate**: Target <3%

### A/B Testing Metrics
- **Lead Capture Rate**: Target +15-25% improvement
- **Booking Conversion**: Target +10-20% improvement
- **Response Latency**: Target <2000ms P95
- **Error Rate**: Target <3%
- **Cost**: Expected $0.25 per 1K messages (up from $0.15)

### Go/No-Go Thresholds

**🟢 Increase Rollout:**
- Lead capture +15%+ (statistically significant)
- Error rate <3%
- No major user complaints

**⚠️ Monitor Closely:**
- Lead capture +5% to +15%
- Error rate 3-5%
- Latency 2000-3000ms

**🛑 Rollback:**
- Lead capture worse than control
- Error rate >5%
- Latency >3000ms
- Cost >$0.35 per 1K messages

---

## 🗄️ Database Migrations

**Completed:**
- ✅ Migration 006: Visitor profiles (cross-session memory)
- ✅ Migration 007: Shadow mode comparisons
- ✅ Migration 008: A/B test cohorts
- ✅ Migration 009: A/B test metrics

**To run a migration:**
```bash
cd database
node run-migration-XXX.js
```

**To verify:**
```sql
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;
```

---

## 🔧 Environment Variables Reference

### Agent System
```bash
USE_LANGCHAIN_AGENT=true          # Enable agent (false = state machine only)
OPENAI_API_KEY=sk-...             # Required for agent
```

### Shadow Mode
```bash
AGENT_SHADOW_MODE=true            # Enable shadow mode
SHADOW_MODE_CHATBOTS=id1,id2      # Optional: specific chatbots only
SHADOW_MODE_SAMPLE_RATE=1.0       # Optional: 0.0-1.0 (default 100%)
```

### A/B Testing
```bash
AGENT_ROLLOUT_PERCENTAGE=10       # 0-100 (percentage using agent)
                                   # 0 = all control
                                   # 100 = all agent
                                   # 1-99 = A/B testing mode
```

### Other
```bash
DATABASE_URL=postgresql://...     # Database connection
```

---

## 📁 Key Files Location

### Services
- Agent orchestrator: `backend/src/services/agentOrchestrator.ts`
- State machine: `backend/src/services/conversationStateMachineService.ts`
- RAG service: `backend/src/services/ragService.ts`
- Shadow mode: `backend/src/services/shadowModeService.ts`
- A/B test service: `backend/src/services/abTestService.ts`
- Metrics tracking: `backend/src/services/abTestMetricsService.ts`

### Tools (7 total)
- `backend/src/services/tools/answerQuestionTool.ts` - RAG retrieval
- `backend/src/services/tools/analyzeIntentTool.ts` - Intent detection
- `backend/src/services/tools/captureLeadTool.ts` - Email/name collection
- `backend/src/services/tools/askQualificationTool.ts` - Qualification questions
- `backend/src/services/tools/offerBookingTool.ts` - Calendly link generation
- `backend/src/services/tools/sendNotificationTool.ts` - Owner alerts
- `backend/src/services/tools/updateVisitorProfileTool.ts` - Memory updates

### Configuration
- Agent config: `backend/src/config/agent.ts`
- Agent types: `backend/src/types/agent.ts`

### Analysis Scripts
- Shadow mode viewer: `backend/view-shadow-mode.js`
- A/B test dashboard: `backend/view-ab-test.js`

### Documentation
- Phase 1 complete: `LANGCHAIN_AGENT_PHASE1_COMPLETE.md`
- Phase 2 complete: `SHADOW_MODE_PHASE2_COMPLETE.md`
- Phase 3 complete: `AB_TEST_PHASE3_COMPLETE.md`
- Implementation plan: `.claude/plans/smooth-munching-kettle.md`

---

## 🐛 Common Issues

### "No shadow mode comparisons found"
**Fix:**
```bash
# Verify settings
AGENT_SHADOW_MODE=true
USE_LANGCHAIN_AGENT=false  # Must be false!

# Restart and test
cd backend && npm start
```

### "No A/B test data found"
**Fix:**
```bash
# Verify settings
AGENT_SHADOW_MODE=false  # Must be false!
USE_LANGCHAIN_AGENT=true
AGENT_ROLLOUT_PERCENTAGE=10

# Restart
cd backend && npm start
```

### Agent errors/timeouts
**Check:**
1. OpenAI API key is valid
2. Database connection working
3. RAG documents are indexed
4. Check logs: `cd backend && npm start` (watch console)

### TypeScript compilation errors
```bash
cd backend && npm run build
# Fix errors shown, then restart
```

---

## 🔐 Security Notes

### Sensitive Files (Never Commit)
- `backend/.env` - Contains API keys and database credentials
- `.env` - Root environment file

### Database Credentials
- Connection string in `.env` as `DATABASE_URL`
- Uses SSL with Supabase pooler
- Service role key needed for migrations

---

## 💰 Cost Estimates

### State Machine (Current)
- ~$0.15 per 1,000 messages
- Embedding lookup + GPT-4o-mini response

### Agent (New)
- ~$0.25 per 1,000 messages (+67%)
- Embedding + tool calls + agent reasoning
- Alert threshold: >$0.35 per 1K messages

**Expected ROI:** Better lead quality should offset 67% cost increase

---

## 🚨 Emergency Rollback

### If Agent Breaks Production

**Option 1: Instant Environment Variable Rollback**
```bash
# Set percentage to 0 (routes all to state machine)
AGENT_ROLLOUT_PERCENTAGE=0

# Restart
pm2 restart chatbot-backend
# OR on Railway: update env var in dashboard
```

**Option 2: Full Agent Disable**
```bash
USE_LANGCHAIN_AGENT=false

# Restart
cd backend && npm start
```

**Option 3: Per-Chatbot Disable**
```javascript
// Via API or database
await abTestService.assignCohort('chatbot-id', 'state_machine');
```

**No database rollback needed** - Agent and state machine share same schema.

---

## 📞 Support Resources

- **GitHub Issues**: https://github.com/anthropics/claude-code/issues
- **LangChain Docs**: https://js.langchain.com/docs
- **OpenAI API Docs**: https://platform.openai.com/docs

---

**Last Updated**: January 27, 2026 (Phase 3 Complete)
