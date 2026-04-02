import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Role } from '../../../common/enums/role.enum';
import { UserStatus } from '../../../common/enums/user-status.enum';
import {
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateUserDto {
  @ApiProperty({ example: 'analyst@finance.local' })
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

  @ApiProperty({ example: 'Data Analyst' })
  @IsString()
  @MaxLength(80)
  name: string;

  @ApiProperty({ enum: Role, default: Role.ANALYST })
  @IsEnum(Role)
  role: Role;

  @ApiPropertyOptional({ enum: UserStatus, default: UserStatus.ACTIVE })
  @IsOptional()
  @IsEnum(UserStatus)
  status?: UserStatus;
}
