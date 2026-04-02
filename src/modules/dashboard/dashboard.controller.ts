import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiUnauthorizedResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { TrendQueryDto } from './dto/trend-query.dto';
import { DashboardService } from './dashboard.service';

@ApiTags('Dashboard')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('summary')
  @Roles(Role.VIEWER, Role.ANALYST, Role.ADMIN)
  @ApiOperation({ summary: 'Get total income, expenses, and net balance' })
  @ApiOkResponse({ description: 'Summary fetched successfully.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid JWT token.' })
  @ApiForbiddenResponse({ description: 'Insufficient role permissions.' })
  getSummary() {
    return this.dashboardService.getSummary();
  }

  @Get('category-totals')
  @Roles(Role.ANALYST, Role.ADMIN)
  @ApiOperation({ summary: 'Get category-wise totals for financial records' })
  @ApiOkResponse({ description: 'Category totals fetched successfully.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid JWT token.' })
  @ApiForbiddenResponse({ description: 'Insufficient role permissions.' })
  getCategoryTotals() {
    return this.dashboardService.getCategoryTotals();
  }

  @Get('recent-activity')
  @Roles(Role.VIEWER, Role.ANALYST, Role.ADMIN)
  @ApiOperation({ summary: 'Get recent financial activity entries' })
  @ApiOkResponse({ description: 'Recent activity fetched successfully.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid JWT token.' })
  @ApiForbiddenResponse({ description: 'Insufficient role permissions.' })
  getRecentActivity() {
    return this.dashboardService.getRecentActivity();
  }

  @Get('trends')
  @Roles(Role.ANALYST, Role.ADMIN)
  @ApiOperation({ summary: 'Get weekly or monthly trend data' })
  @ApiOkResponse({ description: 'Trend data fetched successfully.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid JWT token.' })
  @ApiForbiddenResponse({ description: 'Insufficient role permissions.' })
  getTrends(@Query() query: TrendQueryDto) {
    return this.dashboardService.getTrends(query.range ?? 'monthly');
  }
}
