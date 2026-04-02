import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { RecordType } from '../../../common/enums/record-type.enum';

export class UpdateRecordDto {
  @ApiPropertyOptional({ example: 120.5 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  amount?: number;

  @ApiPropertyOptional({ enum: RecordType })
  @IsOptional()
  @IsEnum(RecordType)
  type?: RecordType;

  @ApiPropertyOptional({ example: 'Utilities' })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  category?: string;

  @ApiPropertyOptional({ example: '2026-04-01T00:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  date?: string;

  @ApiPropertyOptional({ example: 'Updated note' })
  @IsOptional()
  @IsString()
  @MaxLength(240)
  notes?: string;
}
