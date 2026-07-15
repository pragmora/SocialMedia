import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

@Injectable()
export class DashboardService {
  constructor(private readonly supabase: SupabaseService) {}

  async getSummary(workspaceId: string) {
    // Status counts
    const { data: counts } = await this.supabase.db
      .from('content_items')
      .select('status')
      .eq('workspace_id', workspaceId);

    const statusCounts: Record<string, number> = {
      draft: 0,
      review: 0,
      approved: 0,
      published: 0,
      archived: 0,
    };

    for (const item of counts || []) {
      statusCounts[item.status] = (statusCounts[item.status] || 0) + 1;
    }

    // Recent items
    const { data: recent } = await this.supabase.db
      .from('content_items')
      .select('id, workspace_id, client_id, title, description, platform, content_type, status, scheduled_date, created_by, created_at, updated_at')
      .eq('workspace_id', workspaceId)
      .order('updated_at', { ascending: false })
      .limit(10);

    // Overdue tasks
    const { data: overdue } = await this.supabase.db
      .from('tasks')
      .select('id', { count: 'exact', head: true })
      .eq('workspace_id', workspaceId)
      .eq('done', false)
      .not('due_date', 'is', null)
      .lt('due_date', new Date().toISOString().slice(0, 10));

    return {
      status_counts: statusCounts,
      recent_items: recent || [],
      overdue_tasks: overdue?.length || 0,
    };
  }
}
