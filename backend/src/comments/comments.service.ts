import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { ContentService } from '../content/content.service';
import { CreateCommentDto } from './dto';
import { ErrMsg } from '../common/errors';

@Injectable()
export class CommentsService {
  constructor(
    private readonly supabase: SupabaseService,
    private readonly contentSvc: ContentService,
  ) {}

  async list(workspaceId: string, contentItemId: string) {
    // Verify content exists in workspace
    await this.contentSvc.get(workspaceId, contentItemId);

    const { data } = await this.supabase.db
      .from('comments')
      .select('id, content_item_id, author_id, body, created_at, users!inner(name, email)')
      .eq('content_item_id', contentItemId)
      .order('created_at', { ascending: true });

    return (data || []).map((c: any) => ({
      id: c.id,
      content_item_id: c.content_item_id,
      author_id: c.author_id,
      body: c.body,
      created_at: c.created_at,
      author_name: c.users?.name,
      author_email: c.users?.email,
    }));
  }

  async create(workspaceId: string, contentItemId: string, authorId: string, dto: CreateCommentDto) {
    if (!dto.body) throw new BadRequestException('el comentario es obligatorio');

    // Verify content exists in workspace
    await this.contentSvc.get(workspaceId, contentItemId);

    const { data, error } = await this.supabase.db
      .from('comments')
      .insert({
        content_item_id: contentItemId,
        author_id: authorId,
        body: dto.body,
      })
      .select('*')
      .single();

    if (error) throw error;
    return data;
  }

  async delete(workspaceId: string, commentId: string, authorId: string) {
    // Delete scoped through content_items workspace
    const { error } = await this.supabase.db.rpc('delete_comment', {
      p_comment_id: commentId,
      p_author_id: authorId,
      p_workspace_id: workspaceId,
    });

    if (error) {
      // Try direct delete as fallback
      const { data: comment } = await this.supabase.db
        .from('comments')
        .select('id, content_item_id, author_id')
        .eq('id', commentId)
        .single();

      if (!comment) throw new NotFoundException({ code: 'not_found', message: ErrMsg.COMMENT_NOT_FOUND });
      if (comment.author_id !== authorId) throw new NotFoundException({ code: 'not_found', message: ErrMsg.COMMENT_NOT_FOUND });

      const { data: contentItem } = await this.supabase.db
        .from('content_items')
        .select('workspace_id')
        .eq('id', comment.content_item_id)
        .single();

      if (!contentItem || contentItem.workspace_id !== workspaceId) {
        throw new NotFoundException({ code: 'not_found', message: ErrMsg.COMMENT_NOT_FOUND });
      }

      await this.supabase.db
        .from('comments')
        .delete()
        .eq('id', commentId);
    }
  }
}
