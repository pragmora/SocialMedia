import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { WorkspacesService } from './workspaces.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { WorkspaceGuard } from '../common/workspace.guard';
import { RolesGuard } from '../common/roles.guard';
import { Roles } from '../common/roles.decorator';
import { CurrentUser } from '../common/current-user.decorator';
import { WorkspaceId } from '../common/workspace.decorator';
import { CreateWorkspaceDto, UpdateWorkspaceDto, CreateInviteDto, UpdateMemberRoleDto, AddMemberDto } from './dto';

@Controller()
@UseGuards(JwtAuthGuard)
export class WorkspacesController {
  constructor(private readonly svc: WorkspacesService) {}

  @Get('workspaces')
  list(@CurrentUser('sub') userId: string) {
    return this.svc.list(userId);
  }

  @Post('workspaces')
  create(@CurrentUser('sub') userId: string, @Body() dto: CreateWorkspaceDto) {
    return this.svc.create(userId, dto.name);
  }

  @Get('workspaces/:id')
  get(@CurrentUser('sub') userId: string, @Param('id') id: string) {
    return this.svc.get(userId, id);
  }

  @Put('workspaces/:id')
  update(
    @CurrentUser('sub') userId: string,
    @Param('id') id: string,
    @Body() dto: UpdateWorkspaceDto,
  ) {
    return this.svc.update(userId, id, dto.name);
  }

  @Delete('workspaces/:id')
  delete(@CurrentUser('sub') userId: string, @Param('id') id: string) {
    return this.svc.delete(userId, id);
  }

  @Get('users')
  listAllUsers() {
    return this.svc.listAllUsers();
  }

  @Get('workspaces/:id/members')
  listMembers(@CurrentUser('sub') userId: string, @Param('id') id: string) {
    return this.svc.listMembers(userId, id);
  }

  @Get('members')
  @UseGuards(WorkspaceGuard)
  listMyMembers(
    @CurrentUser('sub') userId: string,
    @WorkspaceId() workspaceId: string,
  ) {
    return this.svc.listMembers(userId, workspaceId);
  }

  @Post('workspaces/:id/members')
  @UseGuards(RolesGuard)
  @Roles('admin')
  addMember(
    @CurrentUser('sub') actorId: string,
    @Param('id') workspaceId: string,
    @Body() dto: AddMemberDto,
  ) {
    return this.svc.addMemberByEmail(actorId, workspaceId, dto.email, dto.role);
  }

  @Put('workspaces/:id/members/:userId')
  updateMemberRole(
    @CurrentUser('sub') actorId: string,
    @Param('id') workspaceId: string,
    @Param('userId') targetUserId: string,
    @Body() dto: UpdateMemberRoleDto,
  ) {
    return this.svc.updateMemberRole(actorId, workspaceId, targetUserId, dto.role);
  }

  @Delete('workspaces/:id/members/:userId')
  removeMember(
    @CurrentUser('sub') actorId: string,
    @Param('id') workspaceId: string,
    @Param('userId') targetUserId: string,
  ) {
    return this.svc.removeMember(actorId, workspaceId, targetUserId);
  }

  @Post('workspaces/:id/invites')
  createInvite(
    @CurrentUser('sub') userId: string,
    @Param('id') workspaceId: string,
    @Body() dto: CreateInviteDto,
  ) {
    return this.svc.createInvite(userId, workspaceId, dto.max_uses, dto.expires_in_hours);
  }

  @Post('invites/:token/claim')
  claimInvite(@CurrentUser('sub') userId: string, @Param('token') token: string) {
    return this.svc.claimInvite(userId, token);
  }

  @Get('workspaces/:id/module-permissions/:userId')
  @UseGuards(RolesGuard)
  @Roles('admin')
  getModulePermissions(
    @Param('id') workspaceId: string,
    @Param('userId') targetUserId: string,
  ) {
    return this.svc.getModulePermissions(workspaceId, targetUserId);
  }

  @Put('workspaces/:id/module-permissions/:userId')
  @UseGuards(RolesGuard)
  @Roles('admin')
  setModulePermissions(
    @Param('id') workspaceId: string,
    @Param('userId') targetUserId: string,
    @Body() body: { modules: { module_key: string; enabled: boolean }[] },
  ) {
    return this.svc.setModulePermissions(workspaceId, targetUserId, body.modules);
  }
}
