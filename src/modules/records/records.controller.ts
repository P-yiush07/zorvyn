import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiCreatedResponse,
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
import { CreateRecordDto } from './dto/create-record.dto';
import { QueryRecordDto } from './dto/query-record.dto';
import { UpdateRecordDto } from './dto/update-record.dto';
import { RecordsService } from './records.service';

@ApiTags('Records')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('records')
export class RecordsController {
  constructor(private readonly recordsService: RecordsService) {}

  @Post()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Create a financial record (admin only)' })
  @ApiCreatedResponse({ description: 'Record created successfully.' })
  @ApiBadRequestResponse({ description: 'Invalid request payload.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid JWT token.' })
  @ApiForbiddenResponse({ description: 'Insufficient role permissions.' })
  create(
    @Body() createRecordDto: CreateRecordDto,
    @Req() req: { user: { id: string } },
  ) {
    return this.recordsService.create(createRecordDto, req.user.id);
  }

  @Get()
  @Roles(Role.ANALYST, Role.ADMIN)
  @ApiOperation({
    summary: 'Get records with filtering and optional pagination',
  })
  @ApiOkResponse({ description: 'Records fetched successfully.' })
  @ApiBadRequestResponse({ description: 'Invalid query payload.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid JWT token.' })
  @ApiForbiddenResponse({ description: 'Insufficient role permissions.' })
  findAll(@Query() query: QueryRecordDto) {
    return this.recordsService.findAll(query);
  }

  @Get(':id')
  @Roles(Role.ANALYST, Role.ADMIN)
  @ApiOperation({ summary: 'Get one financial record by id' })
  @ApiOkResponse({ description: 'Record fetched successfully.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid JWT token.' })
  @ApiForbiddenResponse({ description: 'Insufficient role permissions.' })
  findOne(@Param('id') id: string) {
    return this.recordsService.findOne(id);
  }

  @Patch(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Update a financial record (admin only)' })
  @ApiOkResponse({ description: 'Record updated successfully.' })
  @ApiBadRequestResponse({ description: 'Invalid request payload.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid JWT token.' })
  @ApiForbiddenResponse({ description: 'Insufficient role permissions.' })
  update(
    @Param('id') id: string,
    @Body() updateRecordDto: UpdateRecordDto,
    @Req() req: { user: { id: string } },
  ) {
    return this.recordsService.update(id, updateRecordDto, req.user.id);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Soft delete a financial record (admin only)' })
  @ApiOkResponse({ description: 'Record deleted successfully.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid JWT token.' })
  @ApiForbiddenResponse({ description: 'Insufficient role permissions.' })
  remove(@Param('id') id: string, @Req() req: { user: { id: string } }) {
    return this.recordsService.remove(id, req.user.id);
  }
}
