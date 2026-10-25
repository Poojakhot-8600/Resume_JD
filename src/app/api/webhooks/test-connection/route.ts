import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/utils/auth';

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const rawUrl = (body.webhook_url || body.webhookUrl || '').trim();

    if (!rawUrl) {
      return NextResponse.json(
        { success: false, message: 'Webhook URL is required.' },
        { status: 400 }
      );
    }

    let urlObj: URL;
    try {
      urlObj = new URL(rawUrl);
    } catch {
      return NextResponse.json(
        { success: false, message: `Invalid URL format: "${rawUrl}". Make sure it starts with http:// or https://.` },
        { status: 400 }
      );
    }

    const testPayload = {
      test: true,
      timestamp: new Date().toISOString(),
      source: 'Assess AI Webhook Diagnostic',
    };

    const makeCall = async (target: string, timeoutMs = 8000) => {
      const res = await fetch(target, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'AssessAI-Diagnostics/1.0',
        },
        body: JSON.stringify(testPayload),
        signal: AbortSignal.timeout(timeoutMs),
      });
      const text = await res.text().catch(() => '');
      return { status: res.status, statusText: res.statusText, text };
    };

    // 1. Try specified target URL
    try {
      const result = await makeCall(rawUrl);
      
      let suggestion = '';
      if (result.status === 404) {
        suggestion = 'Server reached, but n8n returned 404. Make sure your workflow is toggled to Active / Published in n8n (or click "Listen for test event" if using a test webhook).';
      } else if (result.status === 200 || result.status === 201) {
        suggestion = 'Connection successful! Webhook is active and responding.';
      }

      return NextResponse.json({
        success: result.status < 400,
        status: result.status,
        statusText: result.statusText,
        message: `HTTP ${result.status}: ${result.statusText || 'OK'}`,
        suggestion,
        targetUrl: rawUrl,
      });
    } catch (primaryErr: any) {
      const primaryCause = primaryErr.cause ? (primaryErr.cause.code || primaryErr.cause.message || String(primaryErr.cause)) : '';
      const primaryMsg = primaryCause ? `${primaryErr.message} (${primaryCause})` : primaryErr.message;

      // 2. If it was HTTPS, check if HTTP works instead
      if (rawUrl.startsWith('https://')) {
        const httpFallback = rawUrl.replace(/^https:\/\//i, 'http://');
        try {
          const fallbackResult = await makeCall(httpFallback, 6000);
          return NextResponse.json({
            success: false,
            targetUrl: rawUrl,
            fallbackUrl: httpFallback,
            isSslIssue: true,
            status: fallbackResult.status,
            message: `HTTPS connection to ${rawUrl} failed (${primaryMsg}), but HTTP connection to ${httpFallback} responded with HTTP ${fallbackResult.status}!`,
            suggestion: `Your Hostinger VPS does not have SSL (port 443) active for this host. Switch your webhook URL to start with "http://" instead of "https://".`,
          });
        } catch {
          // HTTP also failed
        }
      }

      // 3. Construct helpful troubleshooting advice
      let suggestion = 'Check if n8n is running and accessible.';
      if (primaryCause === 'ECONNREFUSED' || primaryMsg.includes('ECONNREFUSED')) {
        suggestion = 'Connection refused. n8n might not be listening on this port or host. If on the same VPS, try http://127.0.0.1:5678 or http://localhost:5678.';
      } else if (primaryCause === 'ETIMEDOUT' || primaryMsg.includes('timeout') || primaryMsg.includes('ConnectTimeoutError')) {
        suggestion = 'Connection timed out. Port may be closed or firewalled on your Hostinger VPS. If using HTTPS, port 443 might not be open. Try http:// or specify the correct n8n port.';
      } else if (primaryCause === 'ENOTFOUND' || primaryMsg.includes('ENOTFOUND')) {
        suggestion = 'Domain name not found in DNS. Verify the hostname.';
      }

      return NextResponse.json({
        success: false,
        targetUrl: rawUrl,
        message: `Failed to connect: ${primaryMsg}`,
        suggestion,
      });
    }
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || 'Diagnostic error' },
      { status: 500 }
    );
  }
}
