export interface IssueWebhookPayload {
  event: 'issue.created' | 'issue.updated' | 'issue.resolved' | 'issue.status_changed' | 'escalation.responded';
  issue_id: string;
  title: string;
  description?: string | null;
  category?: string;
  status: string;
  address?: string | null;
  reporter_id?: string;
  reporter_name?: string;
  assigned_department?: string;
  resolution_notes?: string | null;
  resolution_images?: string[];
  billing_cost?: number | null;
  resolved_at?: string | null;
  escalation_notes?: string | null;
  escalation_admin_response?: string | null;
  updated_at: string;
}

export async function triggerN8nWebhook(payload: IssueWebhookPayload): Promise<void> {
  const webhookUrl = process.env.N8N_WEBHOOK_URL || process.env.NEXT_PUBLIC_N8N_WEBHOOK_URL;

  if (!webhookUrl) {
    console.log('[n8n Webhook Simulator] Event triggered:', payload.event, 'for Issue ID:', payload.issue_id);
    return;
  }

  try {
    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CivicFix-Event': payload.event,
      },
      body: JSON.stringify({
        source: 'CivicFix Enterprise Platform',
        timestamp: new Date().toISOString(),
        ...payload,
      }),
      signal: AbortSignal.timeout(5000),
    });

    if (!res.ok) {
      console.warn(`[n8n Webhook] Server returned status ${res.status}`);
    } else {
      console.log(`[n8n Webhook] Dispatched event ${payload.event} successfully`);
    }
  } catch (err) {
    console.error('[n8n Webhook Dispatch Error]:', err instanceof Error ? err.message : err);
  }
}
