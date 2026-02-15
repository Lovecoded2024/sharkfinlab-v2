import { NextRequest, NextResponse } from 'next/server';
import { dataAgent } from '@/lib/data-agent';

// POST /api/data/query - Data Agent 自然语言查询
export async function POST(request: NextRequest) {
  try {
    const { query, conversationId, expectedFormat } = await request.json();

    if (!query) {
      return NextResponse.json(
        { error: 'Query is required' },
        { status: 400 }
      );
    }

    const result = await dataAgent.query({
      conversationId: conversationId || crypto.randomUUID(),
      query,
      expectedFormat: expectedFormat || 'list',
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Data query error:', error);
    return NextResponse.json(
      { 
        error: 'Query failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
