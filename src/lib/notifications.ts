import { createClient } from '@/lib/supabase/server';
import { createClient as createDirectClient } from '@supabase/supabase-js';

interface NotificationPayload {
  user_id: string;
  type?: 'status_change' | 'upvote' | 'comment' | 'follow' | 'system' | 'escalation' | 'escalation_response';
  title: string;
  message: string;
  link: string;
}

/**
 * Get DB client for system notifications.
 * Prefers SUPABASE_SERVICE_ROLE_KEY to bypass RLS when inserting cross-user notifications.
 */
async function getNotificationClient() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;

  if (serviceKey && url) {
    return createDirectClient(url, serviceKey);
  }

  return await createClient();
}

/**
 * Insert a row into the `notifications` table.
 * Uses type 'system' for 100% compatibility with database check constraints.
 */
export async function createNotification(payload: NotificationPayload): Promise<void> {
  try {
    const db = await getNotificationClient();
    
    const notifData: any = {
      user_id: payload.user_id,
      type: 'system',
      title: payload.title,
      message: payload.message,
      is_read: false,
      created_at: new Date().toISOString(),
    };
    if (payload.link) notifData.link = payload.link;

    let { error } = await (db as any)
      .from('notifications')
      .insert(notifData);

    if (error && error.message?.includes('link')) {
      delete notifData.link;
      const res = await (db as any).from('notifications').insert(notifData);
      error = res.error;
    }

    if (error) {
      console.error('[createNotification] DB insert error:', error.message);
    } else {
      console.log('[createNotification] Successfully created notification for user:', payload.user_id);
    }
  } catch (err) {
    console.error('[createNotification] Unexpected error:', err);
  }
}

/**
 * Fetch reporter and all followers for a specific issue to deliver unified notifications.
 */
export async function getIssueSubscribers(issueId: string, reporterId?: string | null): Promise<string[]> {
  try {
    const db = await getNotificationClient();
    const subscribers = new Set<string>();

    if (reporterId) subscribers.add(reporterId);

    const { data: follows } = await (db as any)
      .from('issue_follows')
      .select('user_id')
      .eq('issue_id', issueId);

    if (follows && Array.isArray(follows)) {
      follows.forEach((f: any) => {
        if (f.user_id) subscribers.add(f.user_id);
      });
    }

    return Array.from(subscribers);
  } catch (err) {
    console.error('[getIssueSubscribers] Error fetching followers:', err);
    return reporterId ? [reporterId] : [];
  }
}

/**
 * Generic notification dispatcher for system events, AI analytics alerts, priority spikes, etc.
 */
export async function notifySystemEvent(payload: {
  target_user_ids?: string[];
  target_role?: 'admin' | 'department_officer' | 'all';
  title: string;
  message: string;
  link: string;
}): Promise<void> {
  try {
    const db = await getNotificationClient();
    const userIds = new Set<string>(payload.target_user_ids || []);

    if (payload.target_role === 'admin' || payload.target_role === 'all') {
      const { data: admins } = await (db as any)
        .from('profiles')
        .select('id, role')
        .or('role.ilike.%admin%,role.eq.admin,role.eq.system_admin');
      
      admins?.forEach((a: any) => userIds.add(a.id));
    }

    if (payload.target_role === 'department_officer' || payload.target_role === 'all') {
      const { data: officers } = await (db as any)
        .from('profiles')
        .select('id, role')
        .or('role.ilike.%officer%,role.eq.department_officer');
      
      officers?.forEach((o: any) => userIds.add(o.id));
    }

    for (const userId of userIds) {
      await createNotification({
        user_id: userId,
        type: 'system',
        title: payload.title,
        message: payload.message,
        link: payload.link,
      });
    }
  } catch (err) {
    console.error('[notifySystemEvent] Error:', err);
  }
}

/**
 * Notify ALL system admins about a new escalation.
 */
export async function notifyAdminsOfEscalation(payload: {
  issue_id: string;
  issue_title: string;
  officer_name?: string;
  escalation_notes?: string;
}): Promise<void> {
  await notifySystemEvent({
    target_role: 'admin',
    title: '🚨 NEW ESCALATION FLAGGED',
    message: `Officer ${payload.officer_name || 'Officer'} escalated: "${payload.issue_title}". ${payload.escalation_notes ? `Note: ${payload.escalation_notes.slice(0, 80)}` : ''}`,
    link: `/admin/dashboard?tab=escalations`,
  });
}

/**
 * Notify officer/reporter about an admin escalation response.
 */
export async function notifyOfficerOfAdminResponse(payload: {
  issue_id: string;
  issue_title: string;
  officer_user_id: string;
  reporter_id?: string;
  admin_response: string;
}): Promise<void> {
  const targetUsers: string[] = [];
  if (payload.officer_user_id) targetUsers.push(payload.officer_user_id);
  if (payload.reporter_id) targetUsers.push(payload.reporter_id);

  await notifySystemEvent({
    target_user_ids: targetUsers,
    title: '💬 ADMIN ESCALATION RESPONSE',
    message: `Admin responded to escalation on "${payload.issue_title}": "${payload.admin_response.slice(0, 100)}${payload.admin_response.length > 100 ? '...' : ''}"`,
    link: `/department/dashboard?tab=escalations`,
  });
}
