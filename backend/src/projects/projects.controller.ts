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
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ProjectsService } from './projects.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../common/current-user.decorator';
import { WorkspaceGuard } from '../common/workspace.guard';
import { WorkspaceId } from '../common/workspace.decorator';
import { PermissionGuard } from '../common/permission.guard';
import { Permission } from '../common/permission.decorator';
import { CreateProjectDto, UpdateProjectDto } from './dto';

@Controller('projects')
@UseGuards(JwtAuthGuard, WorkspaceGuard, PermissionGuard)
export class ProjectsController {
  constructor(private readonly svc: ProjectsService) {}

  @Get()
  @Permission('projects', 'view')
  list(@WorkspaceId() wsId: string) {
    return this.svc.list(wsId);
  }

  @Post()
  @Permission('projects', 'create')
  create(@WorkspaceId() wsId: string, @CurrentUser('sub') userId: string, @Body() dto: CreateProjectDto) {
    return this.svc.create(wsId, userId, dto);
  }

  @Get(':id')
  @Permission('projects', 'view')
  get(@WorkspaceId() wsId: string, @Param('id') id: string) {
    return this.svc.get(wsId, id);
  }

  @Put(':id')
  @Permission('projects', 'update')
  update(
    @WorkspaceId() wsId: string,
    @CurrentUser('sub') userId: string,
    @Param('id') id: string,
    @Body() dto: UpdateProjectDto,
  ) {
    return this.svc.update(wsId, userId, id, dto);
  }

  @Delete(':id')
  @Permission('projects', 'delete')
  delete(@WorkspaceId() wsId: string, @Param('id') id: string) {
    return this.svc.delete(wsId, id);
  }

  @Patch(':id/assign')
  @Permission('projects', 'update')
  assign(
    @WorkspaceId() wsId: string,
    @Param('id') id: string,
    @Body('assignee_id') assigneeId: string | null,
  ) {
    return this.svc.assign(wsId, id, assigneeId ?? null);
  }

  @Put(':id/logo')
  @Permission('projects', 'update')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 5 * 1024 * 1024 } }))
  uploadLogo(
    @WorkspaceId() wsId: string,
    @CurrentUser('sub') userId: string,
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.svc.setLogo(wsId, id, file, userId);
  }

  @Delete(':id/logo')
  @Permission('projects', 'update')
  deleteLogo(
    @WorkspaceId() wsId: string,
    @CurrentUser('sub') userId: string,
    @Param('id') id: string,
  ) {
    return this.svc.removeLogo(wsId, id, userId);
  }
}
