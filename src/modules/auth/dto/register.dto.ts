import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Role } from '../../../common/enums/role.enum';
import {
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class RegisterDto {
  @ApiProperty({ example: 'admin@finance.local' })
  @IsEmail()
  email: string;

  @ApiProperty({ minLength: 8, example: 'StrongPass123' })
  @IsString()
  @MinLength(8)
  @MaxLength(64)
  @Matches(/^(?=.*[A-Za-z])(?=.*\d).+$/, {
    message: 'Password must include at least one letter and one number.',
  })
  password: string;

  @ApiProperty({ example: 'Finance Admin' })
  @IsString()
  @MaxLength(80)
  name: string;

  @ApiPropertyOptional({ enum: Role, default: Role.ADMIN })
  @IsOptional()
  @IsEnum(Role)
  role?: Role;
}
