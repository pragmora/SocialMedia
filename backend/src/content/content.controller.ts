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
import { ContentService } from './content.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../common/current-user.decorator';
import { WorkspaceGuard } from '../common/workspace.guard';
import { WorkspaceId } from '../common/workspace.decorator';
import { PermissionGuard } from '../common/permission.guard';
import { Permission } from '../common/permission.decorator';
import { CreateContentDto, UpdateContentDto, TransitionStatusDto } from './dto';

@Controller('content-items')
@UseGuards(JwtAuthGuard, WorkspaceGuard, PermissionGuard)
export class ContentController {
  constructor(private readonly svc: ContentService) {}

  @Get()
  @Permission('content', 'view')
  list(
    @WorkspaceId() wsId: string,
    @CurrentUser('sub') userId: string,
    @Query('status') status?: string,
    @Query('client_id') client_id?: string,
    @Query('project_id') project_id?: string,
    @Query('assigned_to_me') assigned_to_me?: string,
  ) {
    return this.svc.list(wsId, {
      status,
      client_id,
      project_id,
      assigned_to_me: assigned_to_me === 'true' ? userId : undefined,
    });
  }

  @Post()
  @Permission('content', 'create')
  create(
    @WorkspaceId() wsId: string,
    @CurrentUser('sub') userId: string,
    @Body() dto: CreateContentDto,
  ) {
    return this.svc.create(wsId, userId, dto);
  }

  @Get(':id')
  @Permission('content', 'view')
  get(@WorkspaceId() wsId: string, @Param('id') id: string) {
    return this.svc.get(wsId, id);
  }

  @Put(':id')
  @Permission('content', 'update')
  update(
    @WorkspaceId() wsId: string,
    @CurrentUser('sub') userId: string,
    @Param('id') id: string,
    @Body() dto: UpdateContentDto,
  ) {
    return this.svc.update(wsId, userId, id, dto);
  }

  @Patch(':id/assign')
  @Permission('content', 'update')
  assign(
    @WorkspaceId() wsId: string,
    @Param('id') id: string,
    @Body('assignee_id') assigneeId: string | null,
  ) {
    return this.svc.assign(wsId, id, assigneeId ?? null);
  }

  @Patch(':id/status')
  @Permission('content', 'update')
  transitionStatus(
    @WorkspaceId() wsId: string,
    @Param('id') id: string,
    @Body() dto: TransitionStatusDto,
  ) {
    return this.svc.transitionStatus(wsId, id, dto);
  }

  @Delete(':id')
  @Permission('content', 'delete')
  delete(@WorkspaceId() wsId: string, @Param('id') id: string) {
    return this.svc.delete(wsId, id);
  }
}
