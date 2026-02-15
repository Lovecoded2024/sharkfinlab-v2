import { openai, anthropic } from './llm';
import { prisma } from './prisma';

// 数据库 Schema 描述（用于 SQL 生成）
const DB_SCHEMA = `
数据库表结构：

1. stock_basic - 股票基础信息
   - ts_code (VARCHAR): 股票代码，如 '000001.SZ'
   - symbol (VARCHAR): 股票符号
   - name (VARCHAR): 股票名称
   - area (VARCHAR): 地区
   - industry (VARCHAR): 行业
   - market (VARCHAR): 市场类型 (主板/创业板/科创板/北交所)
   - list_date (DATE): 上市日期
   - is_st (BOOLEAN): 是否ST股

2. daily_quotes - 日线行情
   - ts_code (VARCHAR): 股票代码
   - trade_date (DATE): 交易日期
   - open, high, low, close (DECIMAL): 开高低收
   - pre_close (DECIMAL): 昨收
   - change, pct_chg (DECIMAL): 涨跌额/涨跌幅(%)
   - vol (BIGINT): 成交量(手)
   - amount (DECIMAL): 成交额(千元)

3. technical_indicators - 技术指标
   - ts_code (VARCHAR): 股票代码
   - trade_date (DATE): 交易日期
   - ma5, ma10, ma20, ma30, ma60, ma120, ma250 (DECIMAL): 移动平均线
   - rsi_6, rsi_12, rsi_14, rsi_24 (DECIMAL): RSI指标
   - macd_dif, macd_dea, macd_bar (DECIMAL): MACD指标
   - bb_upper, bb_middle, bb_lower (DECIMAL): 布林带
   - kdj_k, kdj_d, kdj_j (DECIMAL): KDJ指标
   - vol_ma5, vol_ma10, vol_ma20 (BIGINT): 成交量均线
   - atr_14, cci_14 (DECIMAL): ATR和CCI指标
   - obv (DECIMAL): OBV能量潮

4. financial_indicators - 财务指标
   - ts_code (VARCHAR): 股票代码
   - ann_date (DATE): 公告日期
   - end_date (DATE): 报告期
   - eps (DECIMAL): 每股收益
   - total_revenue, revenue (DECIMAL): 营业总收入/收入
   - total_profit, net_profit (DECIMAL): 营业利润/净利润
   - grossprofit_margin, netprofit_margin (DECIMAL): 毛利率/净利率
   - debt_to_assets (DECIMAL): 资产负债率
   - roe, roe_waa, roe_dt (DECIMAL): 净资产收益率
   - tr_yoy, or_yoy (DECIMAL): 营收同比增长率

5. agent_accounts - Agent账户
   - agent_id (VARCHAR): Agent ID
   - agent_name (VARCHAR): Agent名称
   - agent_type (VARCHAR): Agent类型
   - total_return (DECIMAL): 总收益率
   - sharpe_ratio (DECIMAL): 夏普比率
   - max_drawdown (DECIMAL): 最大回撤

6. daily_nav - 每日净值
   - agent_id (VARCHAR): Agent ID
   - trade_date (DATE): 交易日期
   - nav (DECIMAL): 单位净值
   - total_value (DECIMAL): 总市值
   - daily_return (DECIMAL): 日收益率
   - cumulative_return (DECIMAL): 累计收益率
`;

// SQL 生成系统提示词
const SQL_GENERATION_PROMPT = `你是一位专业的 SQL 生成专家。根据用户的自然语言查询，生成安全、高效的 PostgreSQL SQL 查询语句。

${DB_SCHEMA}

规则：
1. 只生成 SELECT 查询，禁止生成 INSERT/UPDATE/DELETE/DROP
2. 使用表别名提高可读性
3. 默认查询最新日期的数据，除非用户指定历史日期
4. 对于需要最新数据的查询，使用子查询获取最新日期
5. 返回的字段要完整，包含股票代码和名称
6. 使用合适的排序和限制
7. 对于涨跌幅计算，注意使用正确的公式

查询示例：

用户：帮我找近一个月涨幅超过20%的股票
SQL：
SELECT 
    d.ts_code,
    s.name,
    d.close,
    d.pct_chg,
    (d.close - LAG(d.close, 20) OVER (PARTITION BY d.ts_code ORDER BY d.trade_date)) / LAG(d.close, 20) OVER (PARTITION BY d.ts_code ORDER BY d.trade_date) * 100 as pct_chg_20d
FROM daily_quotes d
JOIN stock_basic s ON d.ts_code = s.ts_code
WHERE d.trade_date = (SELECT MAX(trade_date) FROM daily_quotes)
AND d.close > 0
ORDER BY pct_chg_20d DESC
LIMIT 50;

用户：RSI小于30的超卖股票
SQL：
SELECT 
    t.ts_code,
    s.name,
    t.trade_date,
    t.rsi_14,
    d.close,
    d.pct_chg
FROM technical_indicators t
JOIN stock_basic s ON t.ts_code = s.ts_code
JOIN daily_quotes d ON t.ts_code = d.ts_code AND t.trade_date = d.trade_date
WHERE t.trade_date = (SELECT MAX(trade_date) FROM technical_indicators)
AND t.rsi_14 < 30
AND d.close > 0
ORDER BY t.rsi_14 ASC
LIMIT 50;

请根据用户的查询生成相应的 SQL。只返回 SQL 语句，不要其他解释。`;

// 对话上下文存储
const conversations = new Map<string, {
  queries: string[];
  results: any[];
  createdAt: Date;
  lastUpdatedAt: Date;
}>();

export interface DataQueryRequest {
  conversationId: string;
  query: string;
  expectedFormat?: 'list' | 'summary' | 'timeseries' | 'comparison';
}

export interface DataQueryResponse {
  data: any[];
  sqlQuery: string;
  explanation: string;
  metadata: {
    totalCount: number;
    dateRange?: { start: string; end: string };
    fields: string[];
  };
  suggestions: string[];
}

export class DataAgent {
  private useClaude: boolean;

  constructor() {
    this.useClaude = !!process.env.ANTHROPIC_API_KEY;
  }

  /**
   * 处理数据查询请求
   */
  async query(request: DataQueryRequest): Promise<DataQueryResponse> {
    const startTime = Date.now();
    console.log(`Data query: ${request.query}`, { conversationId: request.conversationId });

    try {
      // 1. 获取或创建对话上下文
      const context = this.getOrCreateContext(request.conversationId);
      
      // 2. 生成 SQL
      const sqlQuery = await this.generateSQL(request.query, context);
      
      // 3. 执行查询
      const rawData = await this.executeSQL(sqlQuery);
      
      // 4. 整理数据
      const processedData = this.processData(rawData, request.expectedFormat);
      
      // 5. 生成摘要和建议
      const summary = await this.generateSummary(request.query, processedData);
      
      // 6. 更新对话上下文
      this.updateContext(context, request.query, processedData);
      
      const response: DataQueryResponse = {
        data: processedData,
        sqlQuery,
        explanation: summary.explanation,
        metadata: {
          totalCount: processedData.length,
          fields: processedData.length > 0 ? Object.keys(processedData[0]) : [],
        },
        suggestions: summary.suggestions,
      };

      console.log(`Query completed in ${Date.now() - startTime}ms`, {
        resultCount: processedData.length,
      });

      return response;
    } catch (error) {
      console.error('Query failed:', error);
      throw error;
    }
  }

  /**
   * 获取或创建对话上下文
   */
  private getOrCreateContext(conversationId: string) {
    if (!conversations.has(conversationId)) {
      conversations.set(conversationId, {
        queries: [],
        results: [],
        createdAt: new Date(),
        lastUpdatedAt: new Date(),
      });
    }
    return conversations.get(conversationId)!;
  }

  /**
   * 更新对话上下文
   */
  private updateContext(
    context: { queries: string[]; results: any[] },
    query: string,
    result: any[]
  ): void {
    context.queries.push(query);
    context.results.push(result);
    
    // 只保留最近 10 轮对话
    if (context.queries.length > 10) {
      context.queries.shift();
      context.results.shift();
    }
  }

  private cleanJsonResponse(content: string): string {
    if (!content) return '{}';
    return content
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/```\s*$/i, '')
      .trim();
  }

  /**
   * 生成 SQL 查询
   */
  private async generateSQL(query: string, context: { queries: string[] }): Promise<string> {
    const contextStr = context.queries.length > 0
      ? `历史查询：${context.queries.slice(-3).join('\n')}` 
      : '';

    const prompt = `${SQL_GENERATION_PROMPT}

${contextStr}

用户查询：${query}`;

    let sql: string;

    if (this.useClaude) {
      const response = await anthropic.messages.create({
        model: 'claude-3-sonnet-20240229',
        max_tokens: 1000,
        messages: [{ role: 'user', content: prompt }],
      });
      sql = response.content[0].type === 'text' ? response.content[0].text : '';
    } else {
      const response = await openai.chat.completions.create({
        model: process.env.MOONSHOT_API_KEY ? 'kimi-k2.5' : 'gpt-4',
        messages: [
          { role: 'system', content: SQL_GENERATION_PROMPT },
          { role: 'user', content: query },
        ],
      });
      sql = response.choices[0].message.content || '';
    }

    // 清理 SQL
    sql = sql.replace(/```sql/g, '').replace(/```/g, '').trim();
    
    // 安全校验：只允许 SELECT
    if (!sql.toLowerCase().startsWith('select')) {
      throw new Error('Generated SQL is not a SELECT statement');
    }

    return sql;
  }

  /**
   * 执行 SQL 查询
   */
  private async executeSQL(sql: string): Promise<any[]> {
    // 使用 Prisma 的 $queryRaw 执行原始 SQL
    const result = await prisma.$queryRawUnsafe(sql);
    return result as any[];
  }

  /**
   * 处理查询结果
   */
  private processData(data: any[], format?: string): any[] {
    if (!data || data.length === 0) {
      return [];
    }

    // 数值格式化
    return data.map(row => {
      const processed: any = {};
      for (const [key, value] of Object.entries(row)) {
        // 保留 4 位小数
        if (typeof value === 'number' && !Number.isInteger(value)) {
          processed[key] = Number(value.toFixed(4));
        } else if (value instanceof Date) {
          processed[key] = value.toISOString().split('T')[0];
        } else if (typeof value === 'bigint') {
          processed[key] = Number(value);
        } else {
          processed[key] = value;
        }
      }
      return processed;
    });
  }

  /**
   * 生成查询摘要
   */
  private async generateSummary(query: string, data: any[]): Promise<{ explanation: string; suggestions: string[] }> {
    if (data.length === 0) {
      return {
        explanation: '没有找到符合条件的数据',
        suggestions: ['尝试放宽查询条件', '检查日期范围是否正确'],
      };
    }

    // 简化摘要生成
    const numericFields = Object.keys(data[0]).filter(k => 
      typeof data[0][k] === 'number'
    );
    
    let explanation = `找到 ${data.length} 条记录`;
    
    if (numericFields.length > 0) {
      const firstNumeric = numericFields[0];
      const values = data.map(d => d[firstNumeric]).filter(v => typeof v === 'number');
      if (values.length > 0) {
        const avg = values.reduce((a, b) => a + b, 0) / values.length;
        explanation += `，${firstNumeric} 平均值: ${avg.toFixed(2)}`;
      }
    }

    return {
      explanation,
      suggestions: ['点击表头排序', '导出数据到 Excel'],
    };
  }

  /**
   * 自然语言对话接口
   */
  async chat(message: string, conversationId?: string): Promise<{
    response: string;
    data?: any[];
    conversationId: string;
  }> {
    const convId = conversationId || crypto.randomUUID();
    
    // 检查是否是数据查询
    const isDataQuery = this.isDataQuery(message);
    
    if (isDataQuery) {
      const result = await this.query({
        conversationId: convId,
        query: message,
        expectedFormat: 'list',
      });

      return {
        response: `${result.explanation}\n\n找到 ${result.metadata.totalCount} 条记录。`,
        data: result.data,
        conversationId: convId,
      };
    } else {
      return {
        response: '我是 Data Agent，可以帮助你查询股票数据。请告诉我你想找什么数据？例如：\n- RSI小于30的股票\n- 近一周涨幅最大的股票\n- 巴菲特的持仓',
        conversationId: convId,
      };
    }
  }

  /**
   * 判断是否是数据查询
   */
  private isDataQuery(message: string): boolean {
    const keywords = [
      '股票', '行情', '价格', '涨跌幅', '市值', '财务', '指标',
      'RSI', 'MACD', '均线', '成交量', '查找', '搜索', '筛选',
      '多少', '哪些', '排名', '最大', '最小', '最高', '最低',
      '查询', '列出', '显示', '帮我找', '有哪些'
    ];
    
    return keywords.some(kw => message.includes(kw));
  }
}

// 导出单例
export const dataAgent = new DataAgent();
