import { NextRequest, NextResponse } from 'next/server';
import { runMintingWorker } from '@/app/scripts/mint-token-worker';

export async function GET(request: NextRequest) {
  // Verify the request is from Vercel Cron
  const authHeader = request.headers.get('authorization');
  
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await runMintingWorker();
    return NextResponse.json({ success: true, timestamp: new Date().toISOString() });
  } catch (error) {
    console.error('Cron job failed:', error);
    return NextResponse.json(
      { error: 'Worker failed', details: error instanceof Error ? error.message : 'Unknown' },
      { status: 500 }
    );
  }
}

// Block non-GET requests
export async function POST() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
}