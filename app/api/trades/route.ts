import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/trades - 获取交易记录
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const agentId = searchParams.get('agentId');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    const where = agentId ? { agentId } : {};

    const [trades, total] = await Promise.all([
      prisma.tradeRecord.findMany({
        where,
        orderBy: { tradeDate: 'desc' },
        take: limit,
        skip: offset,
        include: {
          agent: {
            select: { agentName: true },
          },
        },
      }),
      prisma.tradeRecord.count({ where }),
    ]);

    const formattedTrades = trades.map((trade) => ({
      id: trade.id,
      agentId: trade.agentId,
      agentName: trade.agent?.agentName,
      tradeDate: trade.tradeDate.toISOString().split('T')[0],
      tsCode: trade.tsCode,
      name: trade.name,
      tradeType: trade.tradeType,
      volume: trade.volume,
      price: Number(trade.price),
      amount: Number(trade.amount),
      realizedPnl: trade.realizedPnl ? Number(trade.realizedPnl) : null,
      pnlPct: trade.pnlPct ? Number(trade.pnlPct) : null,
      decisionReason: trade.decisionReason,
      confidence: trade.confidence ? Number(trade.confidence) : null,
    }));

    return NextResponse.json({
      trades: formattedTrades,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      },
    });
  } catch (error) {
    console.error('Error fetching trades:', error);
    return NextResponse.json(
      { error: 'Failed to fetch trades' },
      { status: 500 }
    );
  }
}

// POST /api/trades - 创建交易记录
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      agentId,
      tsCode,
      name,
      tradeType,
      volume,
      price,
      tradeDate,
      decisionReason,
      confidence,
    } = body;

    const amount = price * volume;
    const commission = amount * 0.00025;
    const tax = tradeType === 'SELL' ? amount * 0.001 : 0;

    const trade = await prisma.tradeRecord.create({
      data: {
        agentId,
        tsCode,
        name,
        tradeType,
        volume,
        price,
        amount,
        commission,
        tax,
        transferFee: 0,
        totalCost: amount + commission + tax,
        tradeDate: new Date(tradeDate),
        decisionReason,
        confidence,
      },
    });

    return NextResponse.json(trade);
  } catch (error) {
    console.error('Error creating trade:', error);
    return NextResponse.json(
      { error: 'Failed to create trade' },
      { status: 500 }
    );
  }
}
