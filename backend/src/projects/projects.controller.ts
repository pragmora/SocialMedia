import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ProjectsService } from './projects.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../common/current-user.decorator';
import { WorkspaceGuard } from '../common/workspace.guard';
import { WorkspaceId } from '../common/workspace.decorator';
import { RolesGuard } from '../common/roles.guard';
import { CreateProjectDto, UpdateProjectDto } from './dto';

@Controller('projects')
@UseGuards(JwtAuthGuard, WorkspaceGuard, RolesGuard)
export class ProjectsController {
  constructor(private readonly svc: ProjectsService) {}

  @Get()
  list(@WorkspaceId() wsId: string) {
    return this.svc.list(wsId);
  }

  @Post()
  create(@WorkspaceId() wsId: string, @CurrentUser('sub') userId: string, @Body() dto: CreateProjectDto) {
    return this.svc.create(wsId, userId, dto);
  }

  @Get(':id')
  get(@WorkspaceId() wsId: string, @Param('id') id: string) {
    return this.svc.get(wsId, id);
  }

  @Put(':id')
  update(
    @WorkspaceId() wsId: string,
    @CurrentUser('sub') userId: string,
    @Param('id') id: string,
    @Body() dto: UpdateProjectDto,
  ) {
    return this.svc.update(wsId, userId, id, dto);
  }

  @Delete(':id')
  delete(@WorkspaceId() wsId: string, @Param('id') id: string) {
    return this.svc.delete(wsId, id);
  }

  @Patch(':id/assign')
  assign(
    @WorkspaceId() wsId: string,
    @Param('id') id: string,
    @Body('assignee_id') assigneeId: string | null,
  ) {
    return this.svc.assign(wsId, id, assigneeId ?? null);
  }
}
