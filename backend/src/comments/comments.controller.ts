import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { CommentsService } from './comments.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../common/current-user.decorator';
import { WorkspaceGuard } from '../common/workspace.guard';
import { WorkspaceId } from '../common/workspace.decorator';
import { PermissionGuard } from '../common/permission.guard';
import { Permission } from '../common/permission.decorator';
import { CreateCommentDto } from './dto';

@Controller()
@UseGuards(JwtAuthGuard, WorkspaceGuard, PermissionGuard)
export class CommentsController {
  constructor(private readonly svc: CommentsService) {}

  @Get('content-items/:contentItemId/comments')
  @Permission('content', 'view')
  list(
    @WorkspaceId() wsId: string,
    @Param('contentItemId') contentItemId: string,
  ) {
    return this.svc.list(wsId, contentItemId);
  }

  @Post('content-items/:contentItemId/comments')
  @Permission('content', 'update')
  create(
    @WorkspaceId() wsId: string,
    @Param('contentItemId') contentItemId: string,
    @CurrentUser('sub') userId: string,
    @Body() dto: CreateCommentDto,
  ) {
    return this.svc.create(wsId, contentItemId, userId, dto);
  }

  @Delete('comments/:commentID')
  @Permission('content', 'update')
  delete(
    @WorkspaceId() wsId: string,
    @Param('commentID') commentID: string,
    @CurrentUser('sub') userId: string,
  ) {
    return this.svc.delete(wsId, commentID, userId);
  }
}
