import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  @Get()
  @ApiOperation({ summary: 'Health check endpoint' })
  @ApiOkResponse({ description: 'Service is healthy.' })
  getHealth() {
    return {
      status: 'ok',
      service: 'finance-data-backend',
      timestamp: new Date().toISOString(),
    };
  }
}
