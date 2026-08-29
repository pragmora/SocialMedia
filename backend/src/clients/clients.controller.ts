import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ClientsService } from './clients.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser, IsSuperadmin } from '../common/current-user.decorator';
import { WorkspaceGuard } from '../common/workspace.guard';
import { WorkspaceId } from '../common/workspace.decorator';
import { PermissionGuard } from '../common/permission.guard';
import { Permission } from '../common/permission.decorator';
import { CreateClientDto, UpdateClientDto } from './dto';

@Controller('clients')
@UseGuards(JwtAuthGuard, WorkspaceGuard, PermissionGuard)
export class ClientsController {
  constructor(private readonly svc: ClientsService) {}

  @Get()
  @Permission('clients', 'view')
  list(
    @WorkspaceId() wsId: string,
    @CurrentUser('sub') userId: string,
    @IsSuperadmin() isSuperadmin: boolean,
    @Query('all') all?: string,
    @Query('workspace_id') workspaceId?: string,
  ) {
    if (all === 'true') {
      return this.svc.listAll(userId, isSuperadmin, workspaceId || undefined);
    }
    return this.svc.list(wsId);
  }

  @Post()
  @Permission('clients', 'create')
  create(@WorkspaceId() wsId: string, @CurrentUser('sub') userId: string, @Body() dto: CreateClientDto) {
    return this.svc.create(wsId, userId, dto);
  }

  @Get(':id')
  @Permission('clients', 'view')
  get(@WorkspaceId() wsId: string, @Param('id') id: string) {
    return this.svc.get(wsId, id);
  }

  @Put(':id')
  @Permission('clients', 'update')
  update(
    @WorkspaceId() wsId: string,
    @CurrentUser('sub') userId: string,
    @Param('id') id: string,
    @Body() dto: UpdateClientDto,
  ) {
    return this.svc.update(wsId, userId, id, dto);
  }

  @Delete(':id')
  @Permission('clients', 'delete')
  delete(@WorkspaceId() wsId: string, @Param('id') id: string) {
    return this.svc.delete(wsId, id);
  }
}
