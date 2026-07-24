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
import { Roles } from '../common/roles.decorator';
import { RolesGuard } from '../common/roles.guard';
import { CreateCommentDto } from './dto';

@Controller()
@UseGuards(JwtAuthGuard, WorkspaceGuard, RolesGuard)
export class CommentsController {
  constructor(private readonly svc: CommentsService) {}

  @Get('content-items/:contentItemId/comments')
  list(
    @WorkspaceId() wsId: string,
    @Param('contentItemId') contentItemId: string,
  ) {
    return this.svc.list(wsId, contentItemId);
  }

  @Post('content-items/:contentItemId/comments')
  @Roles('admin', 'cm')
  create(
    @WorkspaceId() wsId: string,
    @Param('contentItemId') contentItemId: string,
    @CurrentUser('sub') userId: string,
    @Body() dto: CreateCommentDto,
  ) {
    return this.svc.create(wsId, contentItemId, userId, dto);
  }

  @Delete('comments/:commentID')
  @Roles('admin', 'cm')
  delete(
    @WorkspaceId() wsId: string,
    @Param('commentID') commentID: string,
    @CurrentUser('sub') userId: string,
  ) {
    return this.svc.delete(wsId, commentID, userId);
  }
}
