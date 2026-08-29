import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { TasksService } from '../tasks/tasks.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../common/current-user.decorator';
import { WorkspaceGuard } from '../common/workspace.guard';
import { WorkspaceId } from '../common/workspace.decorator';
import { PermissionGuard } from '../common/permission.guard';
import { Permission } from '../common/permission.decorator';
import { CreateTaskDto } from '../tasks/dto';

@Controller('content-items/:contentItemId/tasks')
@UseGuards(JwtAuthGuard, WorkspaceGuard, PermissionGuard)
export class ContentTasksController {
  constructor(private readonly tasksSvc: TasksService) {}

  @Get()
  @Permission('tasks', 'view')
  list(
    @WorkspaceId() wsId: string,
    @Param('contentItemId') contentItemId: string,
  ) {
    return this.tasksSvc.list(wsId, { content_item_id: contentItemId });
  }

  @Post()
  @Permission('tasks', 'create')
  create(
    @WorkspaceId() wsId: string,
    @Param('contentItemId') contentItemId: string,
    @CurrentUser('sub') userId: string,
    @Body() dto: CreateTaskDto,
  ) {
    return this.tasksSvc.create(wsId, userId, {
      ...dto,
      content_item_id: contentItemId,
    });
  }
}
