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
import { ClientsService } from './clients.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../common/current-user.decorator';
import { WorkspaceId } from '../common/workspace.decorator';
import { Roles } from '../common/roles.decorator';
import { RolesGuard } from '../common/roles.guard';
import { CreateClientDto, UpdateClientDto } from './dto';

@Controller('clients')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ClientsController {
  constructor(private readonly svc: ClientsService) {}

  @Get()
  list(@WorkspaceId() wsId: string) {
    return this.svc.list(wsId);
  }

  @Post()
  @Roles('admin', 'cm')
  create(@WorkspaceId() wsId: string, @CurrentUser('sub') userId: string, @Body() dto: CreateClientDto) {
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
    @Body() dto: UpdateClientDto,
  ) {
    return this.svc.update(wsId, userId, id, dto);
  }

  @Delete(':id')
  @Roles('admin', 'cm')
  delete(@WorkspaceId() wsId: string, @Param('id') id: string) {
    return this.svc.delete(wsId, id);
  }
}
