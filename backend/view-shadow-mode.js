/**
 * Shadow Mode Comparison Viewer
 * Analyzes and displays comparison data between agent and state machine
 */

require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres.prmafoynoqhelwcnujrx:Gameguardian%235106@aws-1-us-east-1.pooler.supabase.com:6543/postgres',
  ssl: { rejectUnauthorized: false }
});

async function viewShadowMode() {
  try {
    console.log('\n🔍 Shadow Mode Analysis\n');
    console.log('═══════════════════════════════════════════════════════════\n');

    // Get overall statistics
    const stats = await pool.query(`
      SELECT
        COUNT(*) as total_comparisons,
        COUNT(DISTINCT chatbot_id) as chatbots_tested,
        AVG(CASE WHEN mode_matches THEN 1.0 ELSE 0.0 END) * 100 as mode_match_rate,
        AVG(CASE WHEN intent_matches THEN 1.0 ELSE 0.0 END) * 100 as intent_match_rate,
        AVG(decision_alignment_score) as avg_alignment_score,
        AVG(agent_execution_time_ms) as avg_agent_time,
        AVG(state_machine_execution_time_ms) as avg_sm_time,
        AVG(agent_tools_count) as avg_tools_used,
        SUM(CASE WHEN agent_fallback_used THEN 1 ELSE 0 END) as agent_fallbacks,
        SUM(CASE WHEN agent_error IS NOT NULL THEN 1 ELSE 0 END) as agent_errors
      FROM shadow_mode_comparisons
    `);

    const s = stats.rows[0];

    if (parseInt(s.total_comparisons) === 0) {
      console.log('❌ No shadow mode comparisons found yet.\n');
      console.log('💡 To start shadow mode:');
      console.log('   1. Set AGENT_SHADOW_MODE=true in .env');
      console.log('   2. Restart your backend');
      console.log('   3. Have conversations through the widget\n');
      process.exit(0);
    }

    // Overall Stats
    console.log('📊 OVERALL STATISTICS\n');
    console.log(`Total Comparisons:     ${s.total_comparisons}`);
    console.log(`Chatbots Tested:       ${s.chatbots_tested}`);
    console.log(`Mode Match Rate:       ${parseFloat(s.mode_match_rate).toFixed(1)}%`);
    console.log(`Intent Match Rate:     ${parseFloat(s.intent_match_rate).toFixed(1)}%`);
    console.log(`Avg Alignment Score:   ${parseFloat(s.avg_alignment_score).toFixed(1)}/100`);
    console.log(`\nAgent Avg Time:        ${parseInt(s.avg_agent_time)}ms`);
    console.log(`State Machine Avg:     ${parseInt(s.avg_sm_time)}ms`);
    console.log(`Time Difference:       ${(parseInt(s.avg_agent_time) - parseInt(s.avg_sm_time))}ms`);
    console.log(`\nAvg Tools Used:        ${parseFloat(s.avg_tools_used).toFixed(1)}`);
    console.log(`Agent Fallbacks:       ${s.agent_fallbacks}`);
    console.log(`Agent Errors:          ${s.agent_errors}`);

    // Tool usage statistics
    console.log('\n\n🛠️  TOOL USAGE ANALYSIS\n');

    const toolStats = await pool.query(`
      SELECT
        jsonb_array_elements_text(agent_tool_calls) as tool,
        COUNT(*) as usage_count,
        AVG(agent_execution_time_ms)::int as avg_time_ms
      FROM shadow_mode_comparisons
      WHERE agent_tool_calls IS NOT NULL
        AND jsonb_array_length(agent_tool_calls) > 0
      GROUP BY tool
      ORDER BY usage_count DESC
      LIMIT 10
    `);

    if (toolStats.rows.length > 0) {
      console.log('Tool Name                    | Usage Count | Avg Time');
      console.log('─────────────────────────────┼─────────────┼─────────');
      toolStats.rows.forEach(row => {
        const toolName = row.tool.padEnd(28);
        const count = String(row.usage_count).padEnd(11);
        const time = `${row.avg_time_ms}ms`;
        console.log(`${toolName} | ${count} | ${time}`);
      });
    } else {
      console.log('No tool usage data yet.');
    }

    // Mismatches (low alignment scores)
    console.log('\n\n⚠️  DECISION MISMATCHES (Alignment < 70)\n');

    const mismatches = await pool.query(`
      SELECT
        timestamp,
        chatbot_id,
        user_message,
        state_machine_mode,
        agent_mode,
        decision_alignment_score,
        mode_matches,
        agent_tools_count
      FROM shadow_mode_comparisons
      WHERE decision_alignment_score < 70
      ORDER BY decision_alignment_score ASC
      LIMIT 10
    `);

    if (mismatches.rows.length > 0) {
      mismatches.rows.forEach((row, i) => {
        console.log(`\n${i + 1}. Alignment: ${row.decision_alignment_score}/100`);
        console.log(`   Time: ${new Date(row.timestamp).toLocaleString()}`);
        console.log(`   Message: "${row.user_message.substring(0, 60)}${row.user_message.length > 60 ? '...' : ''}"`);
        console.log(`   State Machine Mode: ${row.state_machine_mode}`);
        console.log(`   Agent Mode: ${row.agent_mode} (${row.mode_matches ? '✓' : '✗'} match)`);
        console.log(`   Tools Used: ${row.agent_tools_count}`);
      });
    } else {
      console.log('✅ No significant mismatches found!');
    }

    // Recent comparisons
    console.log('\n\n📝 RECENT COMPARISONS (Last 5)\n');

    const recent = await pool.query(`
      SELECT
        timestamp,
        user_message,
        state_machine_response,
        agent_response,
        mode_matches,
        decision_alignment_score,
        agent_execution_time_ms,
        state_machine_execution_time_ms
      FROM shadow_mode_comparisons
      ORDER BY timestamp DESC
      LIMIT 5
    `);

    recent.rows.forEach((row, i) => {
      console.log(`\n${i + 1}. ${new Date(row.timestamp).toLocaleString()}`);
      console.log(`   User: "${row.user_message.substring(0, 60)}${row.user_message.length > 60 ? '...' : ''}"`);
      console.log(`   State Machine: "${row.state_machine_response.substring(0, 60)}${row.state_machine_response.length > 60 ? '...' : ''}"`);
      console.log(`   Agent: "${row.agent_response.substring(0, 60)}${row.agent_response.length > 60 ? '...' : ''}"`);
      console.log(`   Match: ${row.mode_matches ? '✓' : '✗'} | Alignment: ${row.decision_alignment_score}/100`);
      console.log(`   Time: SM ${row.state_machine_execution_time_ms}ms vs Agent ${row.agent_execution_time_ms}ms`);
    });

    // Recommendations
    console.log('\n\n💡 RECOMMENDATIONS\n');

    const avgAlignment = parseFloat(s.avg_alignment_score);
    const modeMatch = parseFloat(s.mode_match_rate);
    const errorRate = (parseInt(s.agent_errors) / parseInt(s.total_comparisons)) * 100;

    if (avgAlignment >= 90 && modeMatch >= 85) {
      console.log('✅ Excellent alignment! Agent is ready for A/B testing (Phase 3).');
      console.log('   → Set AGENT_ROLLOUT_PERCENTAGE=10 to start gradual rollout');
    } else if (avgAlignment >= 70 && modeMatch >= 70) {
      console.log('⚠️  Good alignment, but needs tuning:');
      if (modeMatch < 80) {
        console.log('   → Review mismatches above to tune agent system prompt');
        console.log('   → Agent may be too aggressive/conservative with lead capture');
      }
      console.log('   → Continue shadow mode for more data');
    } else {
      console.log('❌ Poor alignment detected:');
      console.log('   → Review agent system prompt in agentOrchestrator.ts');
      console.log('   → Check tool execution logs for errors');
      console.log('   → Verify RAG retrieval is working correctly');
    }

    if (errorRate > 5) {
      console.log(`\n⚠️  High error rate (${errorRate.toFixed(1)}%):');
      console.log('   → Check logs for recurring errors');
      console.log('   → Verify LangChain and OpenAI API are working');
    }

    console.log('\n═══════════════════════════════════════════════════════════\n');

  } catch (error) {
    console.error('\n❌ Error analyzing shadow mode:', error.message);
    console.error(error);
  } finally {
    await pool.end();
  }
}

// Run analysis
viewShadowMode().catch(console.error);
