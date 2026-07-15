import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { SupabaseService } from '../supabase/supabase.service';

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(private readonly supabase: SupabaseService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const method = request.method;
    const path = request.route?.path || request.url;

    return next.handle().pipe(
      tap((responseBody) => {
        if (!user?.sub) return;

        const tableName = this.inferTableName(path);
        if (!tableName) return;

        const recordId =
          responseBody?.data?.id ||
          responseBody?.id ||
          request.params?.id;

        if (!recordId) return;

        const action = this.mapMethod(method);
        if (!action) return;

        const workspaceId =
          responseBody?.data?.workspace_id ||
          responseBody?.workspace_id ||
          request.workspaceId;

        this.supabase.db.from('audit_logs').insert({
          table_name: tableName,
          record_id: recordId,
          action,
          old_values: method === 'PUT' || method === 'PATCH' ? request.originalBody : null,
          new_values: responseBody?.data || responseBody,
          performed_by: user.sub,
          workspace_id: workspaceId || null,
        }).then();
      }),
    );
  }

  private inferTableName(path: string): string | null {
    if (path.includes('/content-items')) return 'content_items';
    if (path.includes('/tasks')) return 'tasks';
    if (path.includes('/clients')) return 'clients';
    if (path.includes('/workspaces')) return 'workspaces';
    if (path.includes('/comments')) return 'comments';
    return null;
  }

  private mapMethod(method: string): string | null {
    if (method === 'POST') return 'INSERT';
    if (method === 'PUT' || method === 'PATCH') return 'UPDATE';
    if (method === 'DELETE') return 'DELETE';
    return null;
  }
}
