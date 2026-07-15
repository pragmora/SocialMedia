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
import { WorkspaceId } from '../common/workspace.decorator';
import { Roles } from '../common/roles.decorator';
import { RolesGuard } from '../common/roles.guard';
import { CreateTaskDto } from '../tasks/dto';

@Controller('content-items/:contentItemId/tasks')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ContentTasksController {
  constructor(private readonly tasksSvc: TasksService) {}

  @Get()
  list(
    @WorkspaceId() wsId: string,
    @Param('contentItemId') contentItemId: string,
  ) {
    return this.tasksSvc.list(wsId, { content_item_id: contentItemId });
  }

  @Post()
  @Roles('admin', 'cm')
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
