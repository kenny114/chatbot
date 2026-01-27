# Shadow Mode Implementation - Phase 2 Complete! 🎯

**Status**: ✅ **PHASE 2 COMPLETE**
**Date**: January 27, 2026
**Duration**: Implemented in same session as Phase 1

---

## Summary

Successfully implemented Shadow Mode for safe agent testing! Both the agent and state machine now run in parallel, with results logged for comparison while always returning state machine results to users (zero risk).

---

## ✅ What Was Built

### 1. Shadow Mode Configuration
- ✅ Added `AGENT_SHADOW_MODE` feature flag
- ✅ Added `SHADOW_MODE_CHATBOTS` for selective testing
- ✅ Added `SHADOW_MODE_SAMPLE_RATE` for random sampling
- ✅ Implemented `shouldUseShadowMode()` function

**Location**: `backend/src/config/agent.ts`

### 2. Comparison Logging Service
- ✅ Created `shadowModeService` with full comparison logic
- ✅ Logs side-by-side execution results
- ✅ Calculates decision alignment metrics:
  - Mode matching (50 points)
  - Intent matching (25 points)
  - Response similarity (25 points)
- ✅ Tracks tool usage statistics
- ✅ Identifies mismatches for tuning

**Location**: `backend/src/services/shadowModeService.ts` (273 lines)

### 3. Database Table
- ✅ Created `shadow_mode_comparisons` table
- ✅ Stores all comparison data with metrics
- ✅ Indexed for fast queries
- ✅ GIN index for JSONB tool call analysis

**Migration**: `database/migrations/007_shadow_mode_comparisons.sql`

### 4. Parallel Execution in Webhook
- ✅ Modified webhook controller for shadow mode
- ✅ Executes agent and state machine in parallel using `Promise.allSettled`
- ✅ **Always returns state machine result** (safe!)
- ✅ Logs comparison asynchronously (non-blocking)
- ✅ Graceful error handling

**Modified**: `backend/src/controllers/webhookController.ts`

### 5. Comparison Viewer
- ✅ Created analysis script with dashboard
- ✅ Shows overall statistics
- ✅ Displays tool usage breakdown
- ✅ Identifies decision mismatches
- ✅ Provides recommendations

**Script**: `backend/view-shadow-mode.js`

---

## 🚀 How to Use Shadow Mode

### Option 1: Test Specific Chatbots

```bash
# In backend/.env
AGENT_SHADOW_MODE=true
SHADOW_MODE_CHATBOTS=chatbot-id-1,chatbot-id-2,chatbot-id-3

# Restart backend
cd backend && npm start
```

### Option 2: Test All Chatbots

```bash
# In backend/.env
AGENT_SHADOW_MODE=true

# Restart backend
cd backend && npm start
```

### Option 3: Random Sampling (50% of chatbots)

```bash
# In backend/.env
AGENT_SHADOW_MODE=true
SHADOW_MODE_SAMPLE_RATE=0.5  # 0.0-1.0 (50% of chatbots)

# Restart backend
cd backend && npm start
```

---

## 📊 View Comparison Results

### Run the Viewer

```bash
cd backend && node view-shadow-mode.js
```

### Example Output

```
🔍 Shadow Mode Analysis

═══════════════════════════════════════════════════════════

📊 OVERALL STATISTICS

Total Comparisons:     156
Chatbots Tested:       3
Mode Match Rate:       87.8%
Intent Match Rate:     94.2%
Avg Alignment Score:   82.3/100

Agent Avg Time:        1,234ms
State Machine Avg:     456ms
Time Difference:       778ms

Avg Tools Used:        2.3
Agent Fallbacks:       4
Agent Errors:          2


🛠️  TOOL USAGE ANALYSIS

Tool Name                    | Usage Count | Avg Time
─────────────────────────────┼─────────────┼─────────
answer_question              | 142         | 1100ms
analyze_intent               | 89          | 200ms
capture_lead                 | 23          | 450ms
ask_qualification            | 18          | 320ms
offer_booking                | 12          | 280ms


⚠️  DECISION MISMATCHES (Alignment < 70)

1. Alignment: 45/100
   Message: "How much does it cost?"
   State Machine Mode: INFO_MODE
   Agent Mode: INTENT_CHECK_MODE (✗ match)
   Tools Used: 2


💡 RECOMMENDATIONS

✅ Excellent alignment! Agent is ready for A/B testing (Phase 3).
   → Set AGENT_ROLLOUT_PERCENTAGE=10 to start gradual rollout
```

---

## 📈 Understanding the Metrics

### Decision Alignment Score (0-100)

**Calculation**:
- **50 points**: Conversation mode matches
- **25 points**: Intent level matches
- **25 points**: Response similarity (word overlap)

**Interpretation**:
- **90-100**: Excellent - Agent decisions closely match state machine
- **70-89**: Good - Minor differences, agent may need prompt tuning
- **Below 70**: Poor - Significant differences, review system prompt

### Mode Match Rate

Percentage of times the agent inferred the same conversation mode as the state machine.

**Target**: >85%

### Tool Usage

Which tools the agent uses most frequently. Useful for:
- Understanding agent behavior
- Identifying overused/underused tools
- Optimizing tool descriptions

---

## 🔍 What to Look For

### ✅ Good Signs

- Mode match rate >85%
- Avg alignment score >80
- Agent errors <5%
- Tool usage makes sense (answer_question most used)
- Agent time <2000ms P95

### ⚠️ Warning Signs

- Mode match rate <70% → Agent too aggressive/conservative
- High error rate → Check logs for recurring issues
- Agent time >3000ms → Performance problems
- No tool usage → Agent not using tools properly

### ❌ Red Flags

- Alignment score <50% → System prompt needs major revision
- Agent errors >10% → Critical bugs in tool execution
- Agent captures leads on first message → Violating guidelines

---

## 🛠️ Tuning the Agent

### If Agent is Too Aggressive with Lead Capture

Edit `backend/src/services/agentOrchestrator.ts` system prompt:

```typescript
// Strengthen the minimum exchanges rule
LEAD CAPTURE GUIDELINES:
- CRITICAL: Minimum 3-4 helpful exchanges before considering lead capture
- NEVER capture leads during first 2 messages
```

### If Agent Doesn't Match Mode Transitions

Review mismatches in viewer:

```bash
node view-shadow-mode.js
# Look at "DECISION MISMATCHES" section
# Adjust system prompt based on patterns
```

### If Agent Uses Wrong Tools

Update tool descriptions in `backend/src/services/tools/`:

```typescript
// Make descriptions more specific
description: `Use this tool ONLY when...`
```

---

## 📊 Database Schema

The `shadow_mode_comparisons` table stores:

| Column | Purpose |
|--------|---------|
| `chatbot_id` | Which chatbot was tested |
| `session_id` | Conversation session |
| `user_message` | User's message |
| `state_machine_response` | State machine's response |
| `state_machine_mode` | State machine's mode |
| `agent_response` | Agent's response |
| `agent_mode` | Agent's inferred mode |
| `agent_tool_calls` | Tools agent executed |
| `agent_execution_time_ms` | Agent latency |
| `state_machine_execution_time_ms` | State machine latency |
| `response_similarity` | Word overlap (0-1) |
| `mode_matches` | Boolean: modes match |
| `decision_alignment_score` | Overall score (0-100) |

### Query Examples

```sql
-- Get all comparisons for a chatbot
SELECT * FROM shadow_mode_comparisons
WHERE chatbot_id = 'your-chatbot-id'
ORDER BY timestamp DESC;

-- Find mismatches
SELECT * FROM shadow_mode_comparisons
WHERE decision_alignment_score < 70
ORDER BY decision_alignment_score ASC;

-- Tool usage stats
SELECT
  jsonb_array_elements_text(agent_tool_calls) as tool,
  COUNT(*) as count
FROM shadow_mode_comparisons
WHERE chatbot_id = 'your-chatbot-id'
GROUP BY tool
ORDER BY count DESC;
```

---

## 🔄 Typical Shadow Mode Workflow

### Week 1: Initial Testing (3-5 chatbots)

1. Enable shadow mode for 3-5 test chatbots
2. Run ~50-100 conversations through each
3. Review results with `node view-shadow-mode.js`
4. Tune agent system prompt based on mismatches

### Week 2: Extended Testing (All chatbots)

1. Enable shadow mode globally
2. Collect data from real user interactions
3. Monitor alignment scores daily
4. Fix any recurring errors

### Week 3: Final Validation

1. Verify alignment score >80%
2. Check mode match rate >85%
3. Ensure error rate <3%
4. Review tool usage patterns

### Ready for Phase 3?

**Criteria**:
- ✅ Avg alignment score ≥80
- ✅ Mode match rate ≥85%
- ✅ Agent error rate <5%
- ✅ No critical mismatches in tool usage
- ✅ Response latency acceptable (<2s P95)

→ **Proceed to Phase 3 (A/B Testing with real traffic)**

---

## 🎯 Shadow Mode vs Production Mode

| Feature | Shadow Mode | Production Mode |
|---------|-------------|-----------------|
| **Agent Execution** | ✅ Yes (parallel) | ✅ Yes (exclusive) |
| **State Machine Execution** | ✅ Yes (parallel) | ❌ No |
| **User Sees** | State machine result | Agent result |
| **Risk Level** | Zero risk | Low risk (with fallback) |
| **Purpose** | Testing & tuning | Live usage |
| **Logging** | Full comparison | Standard logs |

---

## 🚧 Limitations

1. **Performance overhead**: Running both systems doubles computation
2. **Not for production traffic**: Should use dedicated test chatbots
3. **Storage**: Comparisons table can grow large (monitor size)
4. **Simple similarity**: Word overlap is basic (could use embeddings)

---

## 🔧 Troubleshooting

### "No shadow mode comparisons found"

**Cause**: Shadow mode not enabled or no conversations yet

**Fix**:
```bash
# Verify .env
AGENT_SHADOW_MODE=true

# Restart backend
npm start

# Have conversations through widget
```

### High error rate

**Cause**: Agent tool execution failures

**Fix**:
```bash
# Check logs
npm start  # Watch for [AgentOrchestrator] errors

# Common causes:
# - OpenAI API key issues
# - Database connection problems
# - Tool implementation bugs
```

### Low alignment scores

**Cause**: Agent system prompt needs tuning

**Fix**:
1. Review mismatches: `node view-shadow-mode.js`
2. Identify patterns (too aggressive? too passive?)
3. Edit `agentOrchestrator.ts` system prompt
4. Re-test with shadow mode

---

## 📝 Configuration Reference

```bash
# Shadow Mode Settings
AGENT_SHADOW_MODE=true                     # Enable/disable
SHADOW_MODE_CHATBOTS=id1,id2,id3          # Specific chatbots (optional)
SHADOW_MODE_SAMPLE_RATE=1.0               # 0.0-1.0, default 1.0 (100%)

# Keep these OFF during shadow mode
USE_LANGCHAIN_AGENT=false                  # Don't use agent in production yet
AGENT_ROLLOUT_PERCENTAGE=0                 # No A/B testing yet
```

---

## 🎓 Next Steps

### Immediate

1. Enable shadow mode for 3-5 test chatbots
2. Run 50-100 conversations
3. Review results with viewer
4. Tune agent prompts if needed

### Short-term (1-2 weeks)

1. Expand to all chatbots
2. Collect 500-1000 comparisons
3. Achieve 80%+ alignment score
4. Fix any recurring errors

### Ready for Phase 3 When:

✅ Alignment score consistently >80%
✅ Mode match rate >85%
✅ Error rate <3%
✅ Team confidence in agent behavior

→ **Then proceed to Phase 3: A/B Testing with real traffic**

---

## 🎉 Phase 2 Complete!

You now have a **safe testing environment** to validate the agent before exposing it to real users!

**Key Benefits**:
- ✨ Zero risk (users always see state machine results)
- 📊 Comprehensive comparison metrics
- 🔍 Easy identification of issues
- 🛠️ Data-driven prompt tuning
- 📈 Clear go/no-go criteria for Phase 3

---

## 📚 Files Created

- `backend/src/services/shadowModeService.ts` - Comparison logging
- `database/migrations/007_shadow_mode_comparisons.sql` - Database table
- `database/run-migration-007.js` - Migration runner
- `backend/view-shadow-mode.js` - Analysis viewer
- `SHADOW_MODE_PHASE2_COMPLETE.md` - This document

**Modified**:
- `backend/src/config/agent.ts` - Shadow mode config
- `backend/src/controllers/webhookController.ts` - Parallel execution

---

## 🚀 Quick Start

```bash
# 1. Enable shadow mode
echo "AGENT_SHADOW_MODE=true" >> backend/.env

# 2. Restart backend
cd backend && npm start

# 3. Have conversations through your widget

# 4. View results
cd backend && node view-shadow-mode.js
```

---

**Ready to tune and validate your agent!** 🎯
