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

    // ── Próximos a vencer ──────────────────────────────────────────────
    const today = new Date().toISOString().slice(0, 10);
    const limitDate = this.addDays(today, 7);

    // Tareas pendientes que vencen dentro de 7 días (o ya vencidas)
    const { data: tasksDue } = await this.supabase.db
      .from('tasks')
      .select('id, title, end_date, done, client_id, project_id, assignee_id, clients(name), projects(name), users!tasks_assignee_id_fkey(name)')
      .or(taskFilter)
      .eq('done', false)
      .not('end_date', 'is', null)
      .lte('end_date', limitDate);

    // Contenidos con fecha de fin dentro de 7 días (o ya vencidos) y todavía activos
    const { data: contentDue } = await this.supabase.db
      .from('content_items')
      .select('id, title, fecha_final, status, client_id, project_id, assignee_id, clients(name), projects(name), users!content_items_assignee_id_fkey(name)')
      .or(`workspace_id.eq.${workspaceId}${sharedProjectIds.length > 0 ? `,project_id.in.(${sharedProjectIds.join(',')})` : ''}`)
      .not('fecha_final', 'is', null)
      .lte('fecha_final', limitDate)
      .not('status', 'in', '(subido,archivado)');

    const dueSoon = [
      ...(tasksDue || []).map((t: any) => ({
        id: t.id,
        title: t.title,
        type: 'task',
        due_date: t.end_date,
        status: 'pre_produccion',
        done: t.done,
        client_name: t.clients?.name ?? null,
        project_name: t.projects?.name ?? null,
        assignee_name: t.users?.name ?? null,
      })),
      ...(contentDue || []).map((c: any) => ({
        id: c.id,
        title: c.title,
        type: 'content',
        due_date: c.fecha_final,
        status: c.status,
        done: false,
        client_name: c.clients?.name ?? null,
        project_name: c.projects?.name ?? null,
        assignee_name: c.users?.name ?? null,
      })),
    ].sort((a, b) => (a.due_date < b.due_date ? -1 : a.due_date > b.due_date ? 1 : 0));

    return {
      status_counts: statusCounts,
      recent_items: recent || [],
      overdue_tasks: overdue?.length || 0,
      due_soon: dueSoon,
    };
  }

  private addDays(dateStr: string, n: number): string {
    const d = new Date(dateStr + 'T12:00:00');
    d.setDate(d.getDate() + n);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }
}
