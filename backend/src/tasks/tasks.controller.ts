import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { TasksService } from './tasks.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../common/current-user.decorator';
import { WorkspaceGuard } from '../common/workspace.guard';
import { WorkspaceId } from '../common/workspace.decorator';
import { PermissionGuard } from '../common/permission.guard';
import { Permission } from '../common/permission.decorator';
import { CreateTaskDto, UpdateTaskDto } from './dto';

@Controller('tasks')
@UseGuards(JwtAuthGuard, WorkspaceGuard, PermissionGuard)
export class TasksController {
  constructor(private readonly svc: TasksService) {}

  @Get()
  @Permission('tasks', 'view')
  list(
    @WorkspaceId() wsId: string,
    @Query('content_item_id') contentItemId?: string,
    @Query('project_id') projectId?: string,
  ) {
    return this.svc.list(wsId, { content_item_id: contentItemId, project_id: projectId });
  }

  @Post()
  @Permission('tasks', 'create')
  create(
    @WorkspaceId() wsId: string,
    @CurrentUser('sub') userId: string,
    @Body() dto: CreateTaskDto,
  ) {
    return this.svc.create(wsId, userId, dto);
  }

  @Get(':id')
  @Permission('tasks', 'view')
  get(@WorkspaceId() wsId: string, @Param('id') id: string) {
    return this.svc.get(wsId, id);
  }

  @Put(':id')
  @Permission('tasks', 'update')
  update(
    @WorkspaceId() wsId: string,
    @CurrentUser('sub') userId: string,
    @Param('id') id: string,
    @Body() dto: UpdateTaskDto,
  ) {
    return this.svc.update(wsId, userId, id, dto);
  }

  @Patch(':id/assign')
  @Permission('tasks', 'update')
  assign(
    @WorkspaceId() wsId: string,
    @CurrentUser('sub') userId: string,
    @Param('id') id: string,
    @Body('assignee_id') assigneeId: string | null,
  ) {
    return this.svc.assign(wsId, userId, id, assigneeId ?? null);
  }

  @Patch(':id/done')
  @Permission('tasks', 'update')
  setDone(
    @WorkspaceId() wsId: string,
    @CurrentUser('sub') userId: string,
    @Param('id') id: string,
    @Body('done') done: boolean,
  ) {
    return this.svc.setDone(wsId, userId, id, done);
  }

  @Delete(':id')
  @Permission('tasks', 'delete')
  delete(
    @WorkspaceId() wsId: string,
    @Param('id') id: string,
  ) {
    return this.svc.delete(wsId, id);
  }
}
