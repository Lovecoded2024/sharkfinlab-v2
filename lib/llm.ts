import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';

// 初始化 OpenAI/Moonshot 客户端
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || process.env.MOONSHOT_API_KEY,
  baseURL: process.env.MOONSHOT_API_KEY 
    ? 'https://api.moonshot.cn/v1' 
    : 'https://api.openai.com/v1',
});

// 初始化 Anthropic 客户端
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export { openai, anthropic };

// 判断使用哪个模型
export function getPreferredModel(): 'claude' | 'openai' {
  return process.env.ANTHROPIC_API_KEY ? 'claude' : 'openai';
}

// 通用 LLM 调用函数
export async function chatCompletion(
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
  options: {
    model?: string;
    temperature?: number;
    responseFormat?: 'text' | 'json';
  } = {}
): Promise<string> {
  const { model = 'claude', temperature = 0.7, responseFormat = 'text' } = options;

  if (model === 'claude' && process.env.ANTHROPIC_API_KEY) {
    const response = await anthropic.messages.create({
      model: 'claude-3-sonnet-20240229',
      max_tokens: 2000,
      temperature,
      messages: messages.map(m => ({
        role: m.role === 'system' ? 'assistant' : m.role,
        content: m.content,
      })) as any,
    });
    return response.content[0].type === 'text' ? response.content[0].text : '';
  } else {
    const response = await openai.chat.completions.create({
      model: process.env.MOONSHOT_API_KEY ? 'kimi-k2.5' : 'gpt-4',
      messages,
      temperature,
      response_format: responseFormat === 'json' ? { type: 'json_object' } : undefined,
    });
    return response.choices[0].message.content || '';
  }
}
