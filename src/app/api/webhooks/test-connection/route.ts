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

    try {
      new URL(rawUrl);
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

    try {
      // redirect:'manual' so we detect HTTP→HTTPS redirects instead of silently
      // following them (which converts POST to GET and causes n8n 404)
      const res = await fetch(rawUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'AssessAI-Diagnostics/1.0',
        },
        body: JSON.stringify(testPayload),
        signal: AbortSignal.timeout(10000),
        redirect: 'manual',
      });

      // Redirect response — POST body was NOT sent to the destination
      if (res.status >= 300 && res.status < 400) {
        const location = res.headers.get('location') || '';
        return NextResponse.json({
          success: false,
          status: res.status,
          targetUrl: rawUrl,
          redirectUrl: location,
          isRedirect: true,
          message: `Redirect detected (HTTP ${res.status}) — called: ${rawUrl}`,
          suggestion: location
            ? `Use "${location}" directly as your webhook URL to avoid POST→GET conversion.`
            : 'Use the https:// URL directly to avoid POST→GET conversion.',
        });
      }

      const text = await res.text().catch(() => '');

      let suggestion = '';
      if (res.status === 404) {
        suggestion = 'n8n returned 404. Make sure your workflow is toggled to Active (Published) in n8n.';
      } else if (res.status === 200 || res.status === 201) {
        suggestion = 'Connection successful! Webhook is active and responding.';
      }

      return NextResponse.json({
        success: res.status < 400,
        status: res.status,
        statusText: res.statusText,
        message: `HTTP ${res.status} from ${rawUrl}`,
        suggestion,
        targetUrl: rawUrl,
      });
    } catch (err: any) {
      const cause = err.cause ? (err.cause.code || err.cause.message || String(err.cause)) : '';
      const detail = cause ? `${err.message} (${cause})` : err.message;

      let suggestion = 'Check if n8n is running and the hostname/port are correct.';
      if (cause === 'ECONNREFUSED' || detail.includes('ECONNREFUSED')) {
        suggestion = 'Connection refused. n8n is not listening on this host/port.';
      } else if (cause === 'ETIMEDOUT' || detail.includes('timeout') || detail.includes('ConnectTimeoutError')) {
        suggestion = 'Connection timed out. Port may be firewalled or n8n is not running.';
      } else if (cause === 'ENOTFOUND' || detail.includes('ENOTFOUND')) {
        suggestion = 'Domain name not found in DNS. Verify the hostname.';
      }

      return NextResponse.json({
        success: false,
        targetUrl: rawUrl,
        message: `Failed to connect — called: ${rawUrl} — ${detail}`,
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
