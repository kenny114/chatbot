/**
 * A/B Test Analysis Dashboard
 * Displays comparative metrics between agent and state machine cohorts
 */

require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres.prmafoynoqhelwcnujrx:Gameguardian%235106@aws-1-us-east-1.pooler.supabase.com:6543/postgres',
  ssl: { rejectUnauthorized: false }
});

function formatPercent(value) {
  return `${parseFloat(value || 0).toFixed(1)}%`;
}

function formatNumber(value) {
  return parseInt(value || 0).toLocaleString();
}

function formatCost(value) {
  return `$${parseFloat(value || 0).toFixed(4)}`;
}

function calculateLift(control, treatment) {
  if (control === 0) return 0;
  return ((treatment - control) / control) * 100;
}

function formatLift(lift) {
  const sign = lift >= 0 ? '+' : '';
  const color = lift >= 0 ? '🟢' : '🔴';
  return `${color} ${sign}${lift.toFixed(1)}%`;
}

// Simple statistical significance test (z-test for proportions)
function isSignificant(n1, p1, n2, p2) {
  if (n1 < 30 || n2 < 30) return false; // Need sufficient sample size

  const pHat = (n1 * p1 + n2 * p2) / (n1 + n2);
  const se = Math.sqrt(pHat * (1 - pHat) * (1/n1 + 1/n2));
  const z = Math.abs((p1 - p2) / se);

  return z > 1.96; // 95% confidence level
}

async function viewABTest() {
  try {
    console.log('\n📊 A/B Test Analysis Dashboard\n');
    console.log('═══════════════════════════════════════════════════════════\n');

    // Check rollout configuration
    const rolloutPercentage = parseInt(process.env.AGENT_ROLLOUT_PERCENTAGE || '0', 10);
    console.log(`⚙️  Configuration: AGENT_ROLLOUT_PERCENTAGE = ${rolloutPercentage}%\n`);

    if (rolloutPercentage === 0) {
      console.log('⚠️  A/B testing is not enabled (AGENT_ROLLOUT_PERCENTAGE = 0)');
      console.log('💡 To enable A/B testing, set AGENT_ROLLOUT_PERCENTAGE to a value between 1-99\n');
      console.log('Example: AGENT_ROLLOUT_PERCENTAGE=10  (10% agent, 90% state machine)\n');
      process.exit(0);
    }

    // Get cohort assignments
    const cohortStats = await pool.query(`
      SELECT
        COUNT(*) as total_chatbots,
        COUNT(*) FILTER (WHERE cohort = 'agent') as agent_chatbots,
        COUNT(*) FILTER (WHERE cohort = 'state_machine') as control_chatbots
      FROM ab_test_cohorts
    `);

    const cohorts = cohortStats.rows[0];
    console.log('📋 COHORT ASSIGNMENTS\n');
    console.log(`Total Chatbots:        ${cohorts.total_chatbots}`);
    console.log(`Agent Cohort:          ${cohorts.agent_chatbots} chatbots (${((cohorts.agent_chatbots / cohorts.total_chatbots) * 100).toFixed(1)}%)`);
    console.log(`Control Cohort:        ${cohorts.control_chatbots} chatbots (${((cohorts.control_chatbots / cohorts.total_chatbots) * 100).toFixed(1)}%)`);

    // Get comparative metrics
    const metricsQuery = await pool.query(`
      SELECT
        cohort,
        COUNT(DISTINCT session_id) as total_conversations,
        SUM(message_count) as total_messages,
        AVG(avg_response_time_ms)::int as avg_response_time_ms,
        AVG(CASE WHEN lead_captured THEN 1.0 ELSE 0.0 END) as lead_capture_rate,
        AVG(CASE WHEN booking_offered THEN 1.0 ELSE 0.0 END) as booking_offer_rate,
        AVG(CASE WHEN booking_clicked THEN 1.0 ELSE 0.0 END) as booking_click_rate,
        AVG(lead_capture_message_count) as avg_messages_to_lead,
        AVG(lead_capture_time_seconds) as avg_time_to_lead_seconds,
        AVG(CASE WHEN agent_errors > 0 THEN 1.0 ELSE 0.0 END) as error_rate,
        AVG(CASE WHEN fallback_used THEN 1.0 ELSE 0.0 END) as fallback_rate,
        AVG(total_tool_calls::float / NULLIF(message_count, 0)) as avg_tool_calls_per_message,
        SUM(estimated_cost_usd) as total_cost_usd,
        AVG(estimated_cost_usd) as avg_cost_per_conversation_usd
      FROM ab_test_metrics
      WHERE created_at >= NOW() - INTERVAL '7 days'
      GROUP BY cohort
      ORDER BY cohort
    `);

    if (metricsQuery.rows.length === 0) {
      console.log('\n❌ No A/B test data found yet.\n');
      console.log('💡 Make sure:');
      console.log('   1. USE_LANGCHAIN_AGENT=true in .env');
      console.log('   2. AGENT_ROLLOUT_PERCENTAGE is between 1-99');
      console.log('   3. You have conversations flowing through the chatbot\n');
      process.exit(0);
    }

    const agentMetrics = metricsQuery.rows.find(r => r.cohort === 'agent');
    const controlMetrics = metricsQuery.rows.find(r => r.cohort === 'state_machine');

    if (!controlMetrics) {
      console.log('\n⚠️  No control (state machine) data found. Need both cohorts for comparison.\n');
      process.exit(0);
    }

    console.log('\n\n📈 PERFORMANCE COMPARISON (Last 7 Days)\n');
    console.log('─────────────────────────────────────────────────────────────');

    // Conversations
    console.log('\n📊 VOLUME METRICS\n');
    console.log('Metric                    | Agent        | Control      | Lift');
    console.log('──────────────────────────┼──────────────┼──────────────┼─────────');

    if (agentMetrics) {
      const convLift = calculateLift(
        parseInt(controlMetrics.total_conversations),
        parseInt(agentMetrics.total_conversations)
      );
      console.log(`Conversations             | ${formatNumber(agentMetrics.total_conversations).padEnd(12)} | ${formatNumber(controlMetrics.total_conversations).padEnd(12)} | ${formatLift(convLift)}`);
      console.log(`Messages                  | ${formatNumber(agentMetrics.total_messages).padEnd(12)} | ${formatNumber(controlMetrics.total_messages).padEnd(12)} | -`);
    } else {
      console.log('No agent data yet - waiting for agent traffic');
    }

    // Lead capture metrics
    console.log('\n\n🎯 CONVERSION METRICS\n');
    console.log('Metric                    | Agent        | Control      | Lift         | Significant?');
    console.log('──────────────────────────┼──────────────┼──────────────┼──────────────┼─────────────');

    if (agentMetrics) {
      const agentLeadRate = parseFloat(agentMetrics.lead_capture_rate);
      const controlLeadRate = parseFloat(controlMetrics.lead_capture_rate);
      const leadLift = calculateLift(controlLeadRate, agentLeadRate);
      const leadSig = isSignificant(
        parseInt(agentMetrics.total_conversations),
        agentLeadRate,
        parseInt(controlMetrics.total_conversations),
        controlLeadRate
      );

      console.log(`Lead Capture Rate         | ${formatPercent(agentLeadRate * 100).padEnd(12)} | ${formatPercent(controlLeadRate * 100).padEnd(12)} | ${formatLift(leadLift).padEnd(12)} | ${leadSig ? '✓ Yes' : '✗ No'}`);

      const agentBookingRate = parseFloat(agentMetrics.booking_offer_rate);
      const controlBookingRate = parseFloat(controlMetrics.booking_offer_rate);
      const bookingLift = calculateLift(controlBookingRate, agentBookingRate);
      const bookingSig = isSignificant(
        parseInt(agentMetrics.total_conversations),
        agentBookingRate,
        parseInt(controlMetrics.total_conversations),
        controlBookingRate
      );

      console.log(`Booking Offer Rate        | ${formatPercent(agentBookingRate * 100).padEnd(12)} | ${formatPercent(controlBookingRate * 100).padEnd(12)} | ${formatLift(bookingLift).padEnd(12)} | ${bookingSig ? '✓ Yes' : '✗ No'}`);

      if (agentMetrics.avg_messages_to_lead) {
        console.log(`Avg Messages to Lead      | ${parseFloat(agentMetrics.avg_messages_to_lead).toFixed(1).padEnd(12)} | ${parseFloat(controlMetrics.avg_messages_to_lead || 0).toFixed(1).padEnd(12)} | -            | -`);
      }
    } else {
      console.log('No agent data yet - waiting for agent traffic');
    }

    // Performance metrics
    console.log('\n\n⚡ PERFORMANCE METRICS\n');
    console.log('Metric                    | Agent        | Control      | Difference');
    console.log('──────────────────────────┼──────────────┼──────────────┼─────────────');

    if (agentMetrics) {
      const agentLatency = parseInt(agentMetrics.avg_response_time_ms);
      const controlLatency = parseInt(controlMetrics.avg_response_time_ms);
      const latencyDiff = agentLatency - controlLatency;
      const latencyColor = latencyDiff > 0 ? '🔴' : '🟢';

      console.log(`Avg Response Time         | ${agentLatency}ms`.padEnd(27) + `| ${controlLatency}ms`.padEnd(14) + `| ${latencyColor} ${latencyDiff > 0 ? '+' : ''}${latencyDiff}ms`);

      const agentErrorRate = parseFloat(agentMetrics.error_rate);
      const controlErrorRate = parseFloat(controlMetrics.error_rate);

      console.log(`Error Rate                | ${formatPercent(agentErrorRate * 100).padEnd(12)} | ${formatPercent(controlErrorRate * 100).padEnd(12)} | -`);

      if (agentMetrics.fallback_rate > 0) {
        console.log(`Fallback Rate             | ${formatPercent(parseFloat(agentMetrics.fallback_rate) * 100).padEnd(12)} | N/A          | -`);
      }

      const agentToolCalls = parseFloat(agentMetrics.avg_tool_calls_per_message || 0);
      console.log(`Avg Tool Calls/Message    | ${agentToolCalls.toFixed(2).padEnd(12)} | N/A          | -`);
    } else {
      console.log('No agent data yet - waiting for agent traffic');
    }

    // Cost metrics
    console.log('\n\n💰 COST ANALYSIS\n');
    console.log('Metric                    | Agent        | Control      | Difference');
    console.log('──────────────────────────┼──────────────┼──────────────┼─────────────');

    if (agentMetrics) {
      const agentCost = parseFloat(agentMetrics.avg_cost_per_conversation_usd);
      const controlCost = parseFloat(controlMetrics.avg_cost_per_conversation_usd);
      const costDiff = agentCost - controlCost;
      const costLift = calculateLift(controlCost, agentCost);

      console.log(`Cost per Conversation     | ${formatCost(agentCost).padEnd(12)} | ${formatCost(controlCost).padEnd(12)} | ${formatCost(costDiff)} (${costLift >= 0 ? '+' : ''}${costLift.toFixed(0)}%)`);
      console.log(`Total Cost (7 days)       | ${formatCost(agentMetrics.total_cost_usd).padEnd(12)} | ${formatCost(controlMetrics.total_cost_usd).padEnd(12)} | -`);
    } else {
      console.log('No agent data yet - waiting for agent traffic');
    }

    // Recommendations
    console.log('\n\n💡 RECOMMENDATIONS\n');

    if (!agentMetrics) {
      console.log('⏳ Waiting for agent cohort data. Keep traffic flowing and check back soon.');
    } else {
      const agentConvs = parseInt(agentMetrics.total_conversations);
      const controlConvs = parseInt(controlMetrics.total_conversations);
      const totalConvs = agentConvs + controlConvs;

      if (totalConvs < 100) {
        console.log(`⏳ Sample size is small (${totalConvs} conversations). Continue collecting data.`);
        console.log('   → Aim for at least 100-200 conversations per cohort for reliable results.');
      } else {
        const agentLeadRate = parseFloat(agentMetrics.lead_capture_rate);
        const controlLeadRate = parseFloat(controlMetrics.lead_capture_rate);
        const leadLift = calculateLift(controlLeadRate, agentLeadRate);
        const leadSig = isSignificant(agentConvs, agentLeadRate, controlConvs, controlLeadRate);

        if (leadSig && leadLift > 15) {
          console.log(`✅ Agent shows significant improvement in lead capture (+${leadLift.toFixed(1)}%)`);
          console.log('   → Consider increasing AGENT_ROLLOUT_PERCENTAGE to 25-50%');
        } else if (leadSig && leadLift < -10) {
          console.log(`⚠️  Agent underperforming in lead capture (${leadLift.toFixed(1)}%)`);
          console.log('   → Review agent system prompt and tool usage');
          console.log('   → Consider reducing AGENT_ROLLOUT_PERCENTAGE or pausing rollout');
        } else if (!leadSig) {
          console.log('📊 No significant difference detected yet.');
          console.log('   → Continue collecting data for more statistical power');
          console.log(`   → Current sample: ${totalConvs} conversations`);
        } else {
          console.log('✓ Agent performing comparably to control.');
          console.log('   → Continue gradual rollout and monitor metrics');
        }

        const agentLatency = parseInt(agentMetrics.avg_response_time_ms);
        const controlLatency = parseInt(controlMetrics.avg_response_time_ms);
        if (agentLatency > controlLatency * 2) {
          console.log(`\n⚠️  Agent latency is significantly higher (${agentLatency}ms vs ${controlLatency}ms)`);
          console.log('   → Consider optimizing agent tool calls or switching to GPT-4o-mini');
        }

        const errorRate = parseFloat(agentMetrics.error_rate);
        if (errorRate > 0.05) {
          console.log(`\n⚠️  High agent error rate (${formatPercent(errorRate * 100)})`);
          console.log('   → Review logs for recurring errors');
          console.log('   → Check OpenAI API quotas and rate limits');
        }
      }
    }

    console.log('\n═══════════════════════════════════════════════════════════\n');

  } catch (error) {
    console.error('\n❌ Error analyzing A/B test:', error.message);
    console.error(error);
  } finally {
    await pool.end();
  }
}

// Run analysis
viewABTest().catch(console.error);
