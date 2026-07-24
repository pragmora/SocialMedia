import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

@Injectable()
export class DashboardService {
  constructor(private readonly supabase: SupabaseService) {}

  private async getSharedProjectIds(workspaceId: string): Promise<string[]> {
    const { data } = await this.supabase.db
      .from('workspace_projects')
      .select('project_id')
      .eq('workspace_id', workspaceId);
    return (data || []).map((r) => r.project_id);
  }

  async getSummary(workspaceId: string) {
    const sharedProjectIds = await this.getSharedProjectIds(workspaceId);

    // Status counts (include shared project content)
    const { data: counts } = await this.supabase.db
      .from('content_items')
      .select('status')
      .or(`workspace_id.eq.${workspaceId}${sharedProjectIds.length > 0 ? `,project_id.in.(${sharedProjectIds.join(',')})` : ''}`);

    const statusCounts: Record<string, number> = {
      pre_produccion: 0,
      en_espera: 0,
      en_edicion: 0,
      validacion: 0,
      listo_para_subir: 0,
      subido: 0,
      archivado: 0,
    };

    for (const item of counts || []) {
      statusCounts[item.status] = (statusCounts[item.status] || 0) + 1;
    }

    // Recent items (include shared project content)
    const { data: recent } = await this.supabase.db
      .from('content_items')
      .select('id, workspace_id, client_id, title, description, platform, content_type, status, scheduled_date, created_by, created_at, updated_at')
      .or(`workspace_id.eq.${workspaceId}${sharedProjectIds.length > 0 ? `,project_id.in.(${sharedProjectIds.join(',')})` : ''}`)
      .order('updated_at', { ascending: false })
      .limit(10);

    // Get content item IDs from shared projects for tasks
    let sharedContentIds: string[] = [];
    if (sharedProjectIds.length > 0) {
      const { data: sharedContent } = await this.supabase.db
        .from('content_items')
        .select('id')
        .in('project_id', sharedProjectIds);
      sharedContentIds = (sharedContent || []).map((c) => c.id);
    }

    // Overdue tasks (workspace tasks OR tasks linked to shared project content)
    const workspaceFilter = `workspace_id.eq.${workspaceId}`;
    const sharedContentFilter = sharedContentIds.length > 0 ? `content_item_id.in.(${sharedContentIds.join(',')})` : '';
    const taskFilter = sharedContentFilter ? `${workspaceFilter},${sharedContentFilter}` : workspaceFilter;

    const { data: overdue } = await this.supabase.db
      .from('tasks')
      .select('id', { count: 'exact', head: true })
      .or(taskFilter)
      .eq('done', false)
      .not('end_date', 'is', null)
      .lt('end_date', new Date().toISOString().slice(0, 10));

    return {
      status_counts: statusCounts,
      recent_items: recent || [],
      overdue_tasks: overdue?.length || 0,
    };
  }
}
