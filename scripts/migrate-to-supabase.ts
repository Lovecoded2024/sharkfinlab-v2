import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

// Supabase 配置
const supabaseUrl = 'https://jngriqpksalsmtpsfiba.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpuZ3JpcXBrc2Fsc210cHNmaWJhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDk4NzUwMiwiZXhwIjoyMDg2NTYzNTAyfQ.d1yvo9Qntfpne00Y4mI8UIFbdQq7ocNok60QSS7P1E0';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// 解析 PostgreSQL COPY 格式数据
function parseCopyData(sqlContent: string, tableName: string): any[] {
  const lines = sqlContent.split('\n');
  const data: any[] = [];
  let inCopyBlock = false;
  let columns: string[] = [];
  
  for (const line of lines) {
    // 查找 COPY 语句开始
    if (line.includes(`COPY public.${tableName}`)) {
      inCopyBlock = true;
      // 提取列名
      const match = line.match(/\(([^)]+)\)/);
      if (match) {
        columns = match[1].split(',').map(c => c.trim());
      }
      continue;
    }
    
    // 结束标记
    if (line === '\\.') {
      inCopyBlock = false;
      continue;
    }
    
    // 解析数据行
    if (inCopyBlock && line.trim() && !line.startsWith('--')) {
      const values = line.split('\t');
      const row: any = {};
      columns.forEach((col, idx) => {
        let value = values[idx];
        // 处理 NULL
        if (value === '\\N') {
          row[col] = null;
        } else if (value === 't') {
          row[col] = true;
        } else if (value === 'f') {
          row[col] = false;
        } else if (!isNaN(Number(value)) && value !== '') {
          row[col] = Number(value);
        } else {
          row[col] = value;
        }
      });
      data.push(row);
    }
  }
  
  return data;
}

async function migrateTable(tableName: string, filePath: string, transform?: (row: any) => any) {
  console.log(`\n迁移表: ${tableName}`);
  
  const sqlContent = fs.readFileSync(filePath, 'utf-8');
  let data = parseCopyData(sqlContent, tableName);
  
  if (transform) {
    data = data.map(transform);
  }
  
  console.log(`  读取到 ${data.length} 条记录`);
  
  if (data.length === 0) {
    console.log('  跳过 (无数据)');
    return;
  }
  
  // 清空现有数据
  const { error: deleteError } = await supabase
    .from(tableName)
    .delete()
    .neq('id', 0);
  
  if (deleteError) {
    console.log(`  清空数据警告: ${deleteError.message}`);
  }
  
  // 批量插入
  const batchSize = 1000;
  for (let i = 0; i < data.length; i += batchSize) {
    const batch = data.slice(i, i + batchSize);
    const { error } = await supabase
      .from(tableName)
      .upsert(batch, { onConflict: 'id' });
    
    if (error) {
      console.error(`  插入错误 (批次 ${i}): ${error.message}`);
    } else {
      process.stdout.write(`  进度: ${Math.min(i + batchSize, data.length)}/${data.length}\r`);
    }
  }
  
  console.log(`  完成! 插入 ${data.length} 条记录`);
}

async function main() {
  console.log('=== SharkFin Lab 数据迁移工具 ===');
  console.log(`目标: ${supabaseUrl}`);
  
  const migrationDir = path.join(__dirname, '../migration');
  
  try {
    // 1. 迁移 Agent 账户
    await migrateTable('agent_accounts', path.join(migrationDir, 'agent_accounts.sql'), (row) => ({
      ...row,
      config: typeof row.config === 'string' ? JSON.parse(row.config) : row.config,
    }));
    
    // 2. 迁移交易记录
    await migrateTable('trade_records', path.join(migrationDir, 'trade_records.sql'), (row) => ({
      ...row,
      thinking_chain: typeof row.thinking_chain === 'string' ? JSON.parse(row.thinking_chain) : row.thinking_chain,
    }));
    
    // 3. 迁移每日净值
    await migrateTable('daily_nav', path.join(migrationDir, 'daily_nav.sql'));
    
    // 4. 迁移股票基础信息
    await migrateTable('stock_basic', path.join(migrationDir, 'stock_basic.sql'));
    
    console.log('\n=== 迁移完成! ===');
    
    // 验证数据
    console.log('\n验证数据:');
    const tables = ['agent_accounts', 'trade_records', 'daily_nav', 'stock_basic'];
    for (const table of tables) {
      const { count, error } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true });
      
      if (error) {
        console.log(`  ${table}: 错误 - ${error.message}`);
      } else {
        console.log(`  ${table}: ${count} 条记录`);
      }
    }
    
  } catch (error) {
    console.error('迁移失败:', error);
    process.exit(1);
  }
}

main();
