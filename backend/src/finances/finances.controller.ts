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
import { FinancesService } from './finances.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../common/current-user.decorator';
import { WorkspaceGuard } from '../common/workspace.guard';
import { WorkspaceId } from '../common/workspace.decorator';
import { PermissionGuard } from '../common/permission.guard';
import { Permission } from '../common/permission.decorator';
import { CreatePaymentDto, UpdatePaymentDto } from './dto';

@Controller('payments')
@UseGuards(JwtAuthGuard, WorkspaceGuard, PermissionGuard)
export class FinancesController {
  constructor(private readonly svc: FinancesService) {}

  @Get()
  @Permission('finances', 'view')
  list(
    @WorkspaceId() wsId: string,
    @Query('client_id') client_id?: string,
    @Query('start_date') start_date?: string,
    @Query('end_date') end_date?: string,
    @Query('project_id') project_id?: string,
    @Query('is_spent') is_spent?: string,
  ) {
    return this.svc.list(wsId, { client_id, start_date, end_date, project_id, is_spent });
  }

  @Post()
  @Permission('finances', 'create')
  create(
    @WorkspaceId() wsId: string,
    @CurrentUser('sub') userId: string,
    @Body() dto: CreatePaymentDto,
  ) {
    return this.svc.create(wsId, userId, dto);
  }

  @Get(':id')
  @Permission('finances', 'view')
  get(@WorkspaceId() wsId: string, @Param('id') id: string) {
    return this.svc.get(wsId, id);
  }

  @Put(':id')
  @Permission('finances', 'update')
  update(
    @WorkspaceId() wsId: string,
    @CurrentUser('sub') userId: string,
    @Param('id') id: string,
    @Body() dto: UpdatePaymentDto,
  ) {
    return this.svc.update(wsId, userId, id, dto);
  }

  @Delete(':id')
  @Permission('finances', 'delete')
  delete(@WorkspaceId() wsId: string, @Param('id') id: string) {
    return this.svc.delete(wsId, id);
  }

  @Patch(':id/toggle-status')
  @Permission('finances', 'update')
  toggleStatus(@WorkspaceId() wsId: string, @Param('id') id: string) {
    return this.svc.toggleStatus(wsId, id);
  }
}
