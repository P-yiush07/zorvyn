import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional } from 'class-validator';

export class TrendQueryDto {
  @ApiPropertyOptional({ enum: ['weekly', 'monthly'], default: 'monthly' })
  @IsOptional()
  @IsIn(['weekly', 'monthly'])
  range?: 'weekly' | 'monthly' = 'monthly';
}
