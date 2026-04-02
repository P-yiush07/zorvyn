import { ApiPropertyOptional } from '@nestjs/swagger';
import { Role } from '../../../common/enums/role.enum';
import { UserStatus } from '../../../common/enums/user-status.enum';
import { IsEnum, IsOptional, IsString } from 'class-validator';

export class UpdateUserDto {
  @ApiPropertyOptional({ example: 'Updated User Name' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ enum: Role })
  @IsOptional()
  @IsEnum(Role)
  role?: Role;

  @ApiPropertyOptional({ enum: UserStatus })
  @IsOptional()
  @IsEnum(UserStatus)
  status?: UserStatus;
}
