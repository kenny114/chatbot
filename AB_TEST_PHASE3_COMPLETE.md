# A/B Testing Implementation - Phase 3 Complete! 🚀

**Status**: ✅ **PHASE 3 COMPLETE**
**Date**: January 27, 2026
**Duration**: Implemented in same session as Phases 1 & 2

---

## Summary

Successfully implemented A/B testing infrastructure for gradual agent rollout! You can now safely roll out the LangChain agent to a percentage of your chatbots while keeping the rest on the proven state machine, with full metrics tracking to measure performance improvements.

---

## ✅ What Was Built

### 1. A/B Test Service
- ✅ Cohort assignment with deterministic hashing
- ✅ Percentage-based rollout (via `AGENT_ROLLOUT_PERCENTAGE`)
- ✅ Persistent cohort storage
- ✅ Manual cohort override capability
- ✅ Cohort statistics and management

**Location**: `backend/src/services/abTestService.ts`

### 2. Webhook Controller Integration
- ✅ A/B routing logic in webhook controller
- ✅ Automatic cohort assignment on first request
- ✅ Seamless switching between agent and state machine
- ✅ Cohort info in logs for debugging
- ✅ Fallback tracking for reliability

**Modified**: `backend/src/controllers/webhookController.ts`

### 3. Metrics Tracking Service
- ✅ Session-level metrics collection
- ✅ Response time tracking (agent vs state machine)
- ✅ Lead capture rate tracking
- ✅ Booking conversion tracking
- ✅ Error rate and fallback tracking
- ✅ Cost estimation per conversation
- ✅ Tool usage analytics

**Location**: `backend/src/services/abTestMetricsService.ts`

### 4. Database Tables
- ✅ `ab_test_cohorts` table for cohort assignments
- ✅ `ab_test_metrics` table for performance metrics
- ✅ Indexed for fast queries
- ✅ Unique constraint on session_id

**Migrations**:
- `database/migrations/008_ab_test_cohorts.sql`
- `database/migrations/009_ab_test_metrics.sql`

### 5. Analysis Dashboard
- ✅ Comparative metrics viewer
- ✅ Statistical significance testing
- ✅ Lift calculations (% improvement)
- ✅ Cost analysis
- ✅ Automated recommendations
- ✅ Sample size validation

**Script**: `backend/view-ab-test.js`

---

## 🚀 How to Use A/B Testing

### Step 1: Start with 10% Rollout

```bash
# In backend/.env
USE_LANGCHAIN_AGENT=true
AGENT_ROLLOUT_PERCENTAGE=10  # 10% agent, 90% state machine

# Restart backend
cd backend && npm start
```

### Step 2: Monitor Metrics

After 50-100 conversations per cohort (1-2 days typically):

```bash
cd backend && node view-ab-test.js
```

### Step 3: Gradually Increase

If metrics look good:

```bash
# Increase to 25%
AGENT_ROLLOUT_PERCENTAGE=25

# Then 50%
AGENT_ROLLOUT_PERCENTAGE=50

# Then 75%
AGENT_ROLLOUT_PERCENTAGE=75

# Finally 100% (or just set USE_LANGCHAIN_AGENT=true)
AGENT_ROLLOUT_PERCENTAGE=100
```

### Step 4: Full Rollout

Once confidence is high:

```bash
# Option 1: 100% via percentage
AGENT_ROLLOUT_PERCENTAGE=100

# Option 2: Remove percentage (all traffic to agent)
USE_LANGCHAIN_AGENT=true
# AGENT_ROLLOUT_PERCENTAGE=0  (or remove this line)
```

---

## 📊 Understanding the Dashboard

### Example Output

```
📊 A/B Test Analysis Dashboard

═══════════════════════════════════════════════════════════

⚙️  Configuration: AGENT_ROLLOUT_PERCENTAGE = 10%

📋 COHORT ASSIGNMENTS

Total Chatbots:        50
Agent Cohort:          5 chatbots (10.0%)
Control Cohort:        45 chatbots (90.0%)


📈 PERFORMANCE COMPARISON (Last 7 Days)

─────────────────────────────────────────────────────────────

📊 VOLUME METRICS

Metric                    | Agent        | Control      | Lift
──────────────────────────┼──────────────┼──────────────┼─────────
Conversations             | 125          | 1,234        | -
Messages                  | 487          | 4,521        | -


🎯 CONVERSION METRICS

Metric                    | Agent        | Control      | Lift         | Significant?
──────────────────────────┼──────────────┼──────────────┼──────────────┼─────────────
Lead Capture Rate         | 32.0%        | 24.5%        | 🟢 +30.6%    | ✓ Yes
Booking Offer Rate        | 18.4%        | 14.2%        | 🟢 +29.6%    | ✓ Yes
Avg Messages to Lead      | 4.2          | 5.8          | -            | -


⚡ PERFORMANCE METRICS

Metric                    | Agent        | Control      | Difference
──────────────────────────┼──────────────┼──────────────┼─────────────
Avg Response Time         | 1,234ms      | 687ms        | 🔴 +547ms
Error Rate                | 1.6%         | 0.3%         | -
Fallback Rate             | 0.8%         | N/A          | -
Avg Tool Calls/Message    | 1.83         | N/A          | -


💰 COST ANALYSIS

Metric                    | Agent        | Control      | Difference
──────────────────────────┼──────────────┼──────────────┼─────────────
Cost per Conversation     | $0.0024      | $0.0015      | $0.0009 (+60%)
Total Cost (7 days)       | $0.30        | $1.85        | -


💡 RECOMMENDATIONS

✅ Agent shows significant improvement in lead capture (+30.6%)
   → Consider increasing AGENT_ROLLOUT_PERCENTAGE to 25-50%
```

---

## 📈 Key Metrics Explained

### Lead Capture Rate
Percentage of conversations that result in a captured lead (email collected).

**Target**: +15-25% improvement over control
**Interpretation**:
- **+30%+**: Excellent! Agent is significantly better at lead capture timing
- **+10-20%**: Good improvement, continue rollout
- **-10% or worse**: Red flag - review agent behavior

### Booking Offer Rate
Percentage of conversations where booking link was offered.

**Target**: +10-20% improvement over control
**Interpretation**: Higher rate indicates better qualification and timing

### Response Latency
Average time to respond to user messages.

**Target**: <2000ms P95 (acceptable range)
**Alert Threshold**: >3000ms (performance issue)

### Error Rate
Percentage of agent executions that failed.

**Target**: <3%
**Alert Threshold**: >5% (critical issue)

### Cost per Conversation
Estimated API cost per conversation.

**Expected**: $0.15 → $0.25 per 1K messages (+67%)
**Alert Threshold**: >$0.35 (optimization needed)

### Statistical Significance
Whether the difference between cohorts is statistically significant (95% confidence).

**Requirements**:
- At least 30 conversations per cohort
- Z-score > 1.96 (p-value < 0.05)

**Interpretation**:
- ✓ Yes: Difference is real, not due to chance
- ✗ No: Need more data or difference is too small

---

## 🎯 Go/No-Go Criteria

### ✅ Green Light - Increase Rollout

- Lead capture rate improvement: +15%+
- Statistical significance: Yes
- Error rate: <3%
- Latency: <2000ms P95
- No major user complaints

**Action**: Increase AGENT_ROLLOUT_PERCENTAGE by 10-25 points

### ⚠️ Yellow Light - Monitor Closely

- Lead capture rate improvement: +5% to +15%
- OR not yet statistically significant
- Error rate: 3-5%
- Latency: 2000-3000ms

**Action**: Continue at current rollout, collect more data

### 🛑 Red Light - Rollback

- Lead capture rate: Worse than control (-10%+)
- Error rate: >5%
- Latency: >3000ms P95
- Cost: >$0.35 per 1K messages
- Multiple user complaints

**Action**: Reduce AGENT_ROLLOUT_PERCENTAGE or set to 0 (rollback)

---

## 🔧 Configuration Reference

```bash
# Agent Feature Flags
USE_LANGCHAIN_AGENT=true              # Enable agent system

# A/B Testing
AGENT_ROLLOUT_PERCENTAGE=10           # 0-100 (10 = 10% agent, 90% control)
                                       # 0 = all control (state machine)
                                       # 100 = all agent
                                       # 1-99 = A/B testing mode

# Shadow Mode (mutually exclusive with A/B testing)
AGENT_SHADOW_MODE=false               # Should be false during A/B testing

# Logging
# Agent execution logs will include [A/B Cohort: agent] or [A/B Cohort: state_machine]
```

---

## 🔍 Advanced Usage

### Manual Cohort Assignment (for testing)

```javascript
// In Node.js or via API
const { abTestService } = require('./backend/src/services/abTestService');

// Assign specific chatbot to agent cohort
await abTestService.assignCohort('chatbot-id-123', 'agent');

// Assign to control cohort
await abTestService.assignCohort('chatbot-id-456', 'state_machine');

// Remove assignment (will use percentage-based assignment)
await abTestService.removeCohortAssignment('chatbot-id-123');
```

### Query Metrics Directly

```javascript
const { abTestMetricsService } = require('./backend/src/services/abTestMetricsService');

// Get metrics for specific chatbot
const metrics = await abTestMetricsService.getComparativeMetrics('chatbot-id', 7); // last 7 days

console.log('Agent metrics:', metrics.agent);
console.log('Control metrics:', metrics.state_machine);

// Get global metrics across all chatbots
const globalMetrics = await abTestMetricsService.getGlobalMetrics(7);
```

### Database Queries

```sql
-- Get all cohort assignments
SELECT * FROM ab_test_cohorts ORDER BY assigned_at DESC;

-- Get metrics for a specific cohort
SELECT * FROM ab_test_metrics
WHERE cohort = 'agent'
  AND created_at >= NOW() - INTERVAL '7 days'
ORDER BY created_at DESC;

-- Compare lead capture rates
SELECT
  cohort,
  AVG(CASE WHEN lead_captured THEN 1.0 ELSE 0.0 END) * 100 as lead_capture_rate
FROM ab_test_metrics
WHERE created_at >= NOW() - INTERVAL '7 days'
GROUP BY cohort;
```

---

## 🔄 Typical A/B Testing Workflow

### Week 1: Initial Testing (10% rollout)

1. Set `AGENT_ROLLOUT_PERCENTAGE=10`
2. Monitor for 3-5 days or 50-100 conversations per cohort
3. Run `node view-ab-test.js` daily
4. Check for critical issues (errors, latency)

**Decision Point**:
- ✅ Metrics good? → Increase to 25%
- ⚠️ Issues? → Fix and continue at 10%
- 🛑 Major problems? → Rollback to 0%

### Week 2: Expanded Testing (25-50% rollout)

1. Increase to `AGENT_ROLLOUT_PERCENTAGE=25`
2. Monitor for 3-5 days or 100-200 conversations per cohort
3. Verify statistical significance
4. If good, increase to 50%

**Decision Point**:
- ✅ Strong positive results? → Increase to 75%
- ⚠️ Marginal results? → Stay at 50%, collect more data
- 🛑 Negative trend? → Rollback to lower percentage

### Week 3: Final Validation (75-100% rollout)

1. Increase to `AGENT_ROLLOUT_PERCENTAGE=75`
2. Monitor for 3-5 days
3. If stable and positive, go to 100%

**Decision Point**:
- ✅ All systems go? → Set to 100% or remove percentage
- ⚠️ New issues? → Stay at 75%, investigate
- 🛑 Critical failure? → Rollback to 50%

### Post-Rollout: 100% Agent

1. Remove `AGENT_ROLLOUT_PERCENTAGE` or set to 100
2. Continue monitoring metrics
3. Keep state machine code for 2 weeks as safety net
4. After confidence period, remove state machine code

---

## ⚠️ Important Notes

### A/B Testing vs Shadow Mode

**DO NOT run both simultaneously!**

| Mode | When to Use | Risk Level |
|------|-------------|------------|
| **Shadow Mode** | Initial validation, prompt tuning | Zero risk (users see state machine) |
| **A/B Testing** | Gradual production rollout | Low risk (only percentage gets agent) |

Shadow mode should be disabled (`AGENT_SHADOW_MODE=false`) when running A/B tests.

### Cohort Consistency

Once a chatbot is assigned to a cohort, it stays in that cohort for the entire A/B test. This ensures:
- Consistent user experience
- Valid statistical comparison
- No cross-contamination

To reset all assignments:
```javascript
await abTestService.resetAllCohorts();
```

### Sample Size Requirements

For valid statistical testing:
- **Minimum**: 30 conversations per cohort
- **Recommended**: 100+ conversations per cohort
- **Ideal**: 200+ conversations per cohort

Small sample sizes will show "✗ No" for statistical significance even with large lifts.

---

## 🐛 Troubleshooting

### "No A/B test data found yet"

**Cause**: A/B testing not enabled or no traffic yet

**Fix**:
```bash
# Verify .env
USE_LANGCHAIN_AGENT=true
AGENT_ROLLOUT_PERCENTAGE=10  # Must be 1-99 for A/B mode

# Restart backend
npm start

# Verify cohort assignments
node -e "
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
pool.query('SELECT * FROM ab_test_cohorts').then(r => console.log(r.rows));
"
```

### "No control (state machine) data found"

**Cause**: All chatbots assigned to agent cohort

**Fix**: Lower `AGENT_ROLLOUT_PERCENTAGE` to ensure some chatbots are in control cohort

### High error rate or fallback rate

**Cause**: Agent execution failures

**Fix**:
1. Check backend logs for errors
2. Verify OpenAI API key and quota
3. Review agent system prompt for issues
4. Consider reducing rollout percentage while investigating

### Metrics show no significant difference

**Possible reasons**:
1. Sample size too small (wait for more conversations)
2. Agent and state machine behaving similarly (expected for well-tuned agent)
3. Variance is high (need more data)

**Action**: Continue collecting data, aim for 100-200 conversations per cohort

---

## 📊 Database Schema

### `ab_test_cohorts` Table

| Column | Type | Purpose |
|--------|------|---------|
| `chatbot_id` | UUID | Chatbot identifier (primary key) |
| `cohort` | VARCHAR | 'agent' or 'state_machine' |
| `is_manual` | BOOLEAN | Whether manually assigned |
| `assigned_at` | TIMESTAMP | When cohort was assigned |

### `ab_test_metrics` Table

| Column | Type | Purpose |
|--------|------|---------|
| `id` | UUID | Metric record ID |
| `chatbot_id` | UUID | Chatbot identifier |
| `session_id` | VARCHAR | Conversation session (unique) |
| `cohort` | VARCHAR | Which system handled this |
| `message_count` | INTEGER | Total messages in conversation |
| `total_response_time_ms` | INTEGER | Cumulative response time |
| `avg_response_time_ms` | INTEGER | Average per message |
| `lead_captured` | BOOLEAN | Whether lead was captured |
| `lead_capture_time_seconds` | INTEGER | Time to capture (from first message) |
| `lead_capture_message_count` | INTEGER | Messages before capture |
| `booking_offered` | BOOLEAN | Whether booking link offered |
| `booking_clicked` | BOOLEAN | Whether user clicked booking |
| `total_tool_calls` | INTEGER | Agent tool calls (agent only) |
| `agent_errors` | INTEGER | Number of errors |
| `fallback_used` | BOOLEAN | Whether fallback was used |
| `estimated_cost_usd` | FLOAT | Estimated API cost |

---

## 🎉 Phase 3 Complete!

You now have a **production-ready A/B testing system** for safely rolling out the LangChain agent!

**Key Benefits**:
- 📊 Data-driven rollout decisions
- 🔍 Real-time comparative metrics
- 📈 Statistical significance testing
- 💰 Cost tracking and analysis
- 🛡️ Low-risk gradual rollout
- 📉 Clear go/no-go criteria

---

## 🚀 Next Steps

### Immediate
1. Set `AGENT_ROLLOUT_PERCENTAGE=10` to start A/B testing
2. Monitor for 3-5 days
3. Run `node view-ab-test.js` daily to check metrics
4. Look for significant improvements in lead capture rate

### Short-term (1-2 weeks)
1. Gradually increase rollout to 25% → 50% → 75%
2. Collect 200+ conversations per cohort for strong statistical power
3. Verify error rate stays <3%
4. Confirm cost is within acceptable range

### Ready for Phase 4 When:
✅ Lead capture rate improvement >15% (statistically significant)
✅ Booking conversion improvement >10%
✅ Error rate <3%
✅ Team confidence in agent performance
✅ No critical issues at 75%+ rollout

→ **Then proceed to Phase 4: Full Migration (100% agent)**

---

## 📚 Files Created

- `backend/src/services/abTestService.ts` - Cohort assignment logic
- `backend/src/services/abTestMetricsService.ts` - Metrics tracking
- `database/migrations/008_ab_test_cohorts.sql` - Cohort table
- `database/migrations/009_ab_test_metrics.sql` - Metrics table
- `database/run-migration-008.js` - Migration runner for cohorts
- `database/run-migration-009.js` - Migration runner for metrics
- `backend/view-ab-test.js` - Analysis dashboard
- `AB_TEST_PHASE3_COMPLETE.md` - This document

**Modified**:
- `backend/src/controllers/webhookController.ts` - Added A/B routing logic

---

## 🎓 Summary: Phase 3 Achievement

**Before Phase 3:**
- Shadow mode only (safe but not in production)
- No way to gradually roll out agent
- No comparative metrics

**After Phase 3:**
- Percentage-based rollout (10% → 25% → 50% → 100%)
- Real production traffic comparison
- Statistical significance testing
- Automated recommendations
- Low-risk, data-driven rollout

**Ready to roll out the agent to production safely!** 🎯
