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
import { Roles } from '../common/roles.decorator';
import { RolesGuard } from '../common/roles.guard';
import { CreatePaymentDto, UpdatePaymentDto } from './dto';

@Controller('payments')
@UseGuards(JwtAuthGuard, WorkspaceGuard, RolesGuard)
export class FinancesController {
  constructor(private readonly svc: FinancesService) {}

  @Get()
  list(
    @WorkspaceId() wsId: string,
    @Query('client_id') client_id?: string,
    @Query('start_date') start_date?: string,
    @Query('end_date') end_date?: string,
  ) {
    return this.svc.list(wsId, { client_id, start_date, end_date });
  }

  @Post()
  @Roles('admin', 'cm')
  create(
    @WorkspaceId() wsId: string,
    @CurrentUser('sub') userId: string,
    @Body() dto: CreatePaymentDto,
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
    @Body() dto: UpdatePaymentDto,
  ) {
    return this.svc.update(wsId, userId, id, dto);
  }

  @Delete(':id')
  @Roles('admin')
  delete(@WorkspaceId() wsId: string, @Param('id') id: string) {
    return this.svc.delete(wsId, id);
  }

  @Patch(':id/toggle-status')
  @Roles('admin', 'cm')
  toggleStatus(@WorkspaceId() wsId: string, @Param('id') id: string) {
    return this.svc.toggleStatus(wsId, id);
  }
}
