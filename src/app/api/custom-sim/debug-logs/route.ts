/**
 * TEMPORARY debug endpoint - tests GitHub job logs API access.
 * DELETE THIS after debugging.
 *
 * GET /api/custom-sim/debug-logs?jobId=66807049462
 */

import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const jobId = new URL(request.url).searchParams.get('jobId');
  if (!jobId) {
    return NextResponse.json({ error: 'Missing jobId param' }, { status: 400 });
  }

  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    return NextResponse.json({ error: 'No GITHUB_TOKEN' }, { status: 500 });
  }

  try {
    const url = `https://api.github.com/repos/ncsizemore/jheem-backend/actions/jobs/${jobId}/logs`;
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github.v3+json',
      },
      redirect: 'follow',
    });

    if (!response.ok) {
      return NextResponse.json({
        error: `GitHub returned ${response.status}`,
        statusText: response.statusText,
        url: response.url,
        redirected: response.redirected,
      });
    }

    const logs = await response.text();
    const matches = [...logs.matchAll(/Simulation progress:\s*(\d+)\s*of\s*(\d+)\s*\((\d+)%\)/g)];

    return NextResponse.json({
      ok: true,
      logBytes: logs.length,
      matchCount: matches.length,
      lastMatch: matches.length > 0 ? {
        current: Number(matches[matches.length - 1][1]),
        total: Number(matches[matches.length - 1][2]),
        percent: Number(matches[matches.length - 1][3]),
      } : null,
      // Show first 200 chars to verify content
      logPreview: logs.substring(0, 200),
    });
  } catch (err) {
    return NextResponse.json({
      error: 'Fetch failed',
      message: err instanceof Error ? err.message : String(err),
    });
  }
}
