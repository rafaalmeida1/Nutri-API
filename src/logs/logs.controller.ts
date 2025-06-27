import {
  Controller,
  Get,
  Query,
  UseGuards,
  Param,
} from '@nestjs/common';
import { LogsService } from './logs.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CurrentUser, CurrentUserData } from '../auth/decorators/current-user.decorator';
import { SuperAdminOnly, NutricionistaOrAdmin } from '../auth/decorators/roles.decorator';
import { Role } from '../auth/enums/role.enum';

@Controller('logs')
@UseGuards(JwtAuthGuard, RolesGuard)
export class LogsController {
  constructor(private logsService: LogsService) {}

  @Get('my-access')
  async getMyAccessLogs(
    @CurrentUser() user: CurrentUserData,
    @Query('limit') limit?: string,
  ) {
    const limitNumber = limit ? parseInt(limit) : 100;
    return this.logsService.findByUser(user.id, limitNumber);
  }

  @Get('stats')
  @SuperAdminOnly()
  async getGlobalStats() {
    return this.logsService.getAccessStats();
  }
} 