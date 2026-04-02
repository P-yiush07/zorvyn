import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
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

export class CreateRecordDto {
  @ApiProperty({ example: 1500.75 })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  amount: number;

  @ApiProperty({ enum: RecordType })
  @IsEnum(RecordType)
  type: RecordType;

  @ApiProperty({ example: 'Salary' })
  @IsString()
  @MaxLength(60)
  category: string;

  @ApiProperty({ example: '2026-04-01T00:00:00.000Z' })
  @IsDateString()
  date: string;

  @ApiPropertyOptional({ example: 'Monthly payroll' })
  @IsOptional()
  @IsString()
  @MaxLength(240)
  notes?: string;
}
