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
import { WorkspaceId } from '../common/workspace.decorator';
import { Roles } from '../common/roles.decorator';
import { RolesGuard } from '../common/roles.guard';
import { CreateTaskDto, UpdateTaskDto } from './dto';

@Controller('tasks')
@UseGuards(JwtAuthGuard, RolesGuard)
export class TasksController {
  constructor(private readonly svc: TasksService) {}

  @Get()
  list(
    @WorkspaceId() wsId: string,
    @Query('content_item_id') contentItemId?: string,
  ) {
    return this.svc.list(wsId, { content_item_id: contentItemId });
  }

  @Post()
  @Roles('admin', 'cm')
  create(
    @WorkspaceId() wsId: string,
    @CurrentUser('sub') userId: string,
    @Body() dto: CreateTaskDto,
  ) {
    return this.svc.create(wsId, userId, dto);
  }

  @Get(':id')
  get(@WorkspaceId() wsId: string, @Param('id') id: string) {
    return this.svc.get(wsId, id);
  }

  @Put(':id')
  @Roles('admin', 'cm')
  update(
    @WorkspaceId() wsId: string,
    @CurrentUser('sub') userId: string,
    @Param('id') id: string,
    @Body() dto: UpdateTaskDto,
  ) {
    return this.svc.update(wsId, userId, id, dto);
  }

  @Patch(':id/assign')
  @Roles('admin', 'cm')
  assign(
    @WorkspaceId() wsId: string,
    @CurrentUser('sub') userId: string,
    @Param('id') id: string,
    @Body('assignee_id') assigneeId: string | null,
  ) {
    return this.svc.assign(wsId, userId, id, assigneeId ?? null);
  }

  @Delete(':id')
  @Roles('admin', 'cm')
  delete(
    @WorkspaceId() wsId: string,
    @Param('id') id: string,
  ) {
    return this.svc.delete(wsId, id);
  }
}
