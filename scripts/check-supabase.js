#!/usr/bin/env node
/**
 * Supabase 数据库初始化脚本
 * 在 Supabase SQL Editor 中执行 init.sql 后运行此脚本验证
 */

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://jngriqpksalsmtpsfiba.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpuZ3JpcXBrc2Fsc210cHNmaWJhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDk4NzUwMiwiZXhwIjoyMDg2NTYzNTAyfQ.d1yvo9Qntfpne00Y4mI8UIFbdQq7ocNok60QSS7P1E0';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function main() {
  console.log('=== Supabase 连接测试 ===\n');
  
  // 测试连接
  const { data: version, error: versionError } = await supabase.rpc('version');
  if (versionError) {
    console.log('连接状态: ⚠️ 无法获取版本 (可能无 version 函数)');
  } else {
    console.log('连接状态: ✅ 成功');
  }
  
  // 检查表
  console.log('\n检查表结构:');
  const tables = [
    'agent_accounts',
    'agent_positions',
    'trade_records',
    'daily_nav',
    'daily_quotes',
    'stock_basic',
    'financial_indicators',
    'technical_indicators',
    'job_logs',
    'data_update_logs'
  ];
  
  for (const table of tables) {
    const { count, error } = await supabase
      .from(table)
      .select('*', { count: 'exact', head: true });
    
    if (error) {
      console.log(`  ❌ ${table}: ${error.message}`);
    } else {
      console.log(`  ✅ ${table}: ${count ?? 0} 条记录`);
    }
  }
  
  // 检查 Agent 数据
  console.log('\n检查 Agent 数据:');
  const { data: agents, error: agentError } = await supabase
    .from('agent_accounts')
    .select('agent_id, agent_name, agent_type, status');
  
  if (agentError) {
    console.log(`  ❌ 无法获取: ${agentError.message}`);
  } else if (agents) {
    agents.forEach((agent) => {
      console.log(`  ✅ ${agent.agent_id}: ${agent.agent_name} (${agent.agent_type}) - ${agent.status}`);
    });
  }
  
  console.log('\n=== 检查完成 ===');
}

main().catch(console.error);
