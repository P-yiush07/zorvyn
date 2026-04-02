import { ApiProperty } from '@nestjs/swagger';
import { IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class ChangePasswordDto {
  @ApiProperty({ minLength: 8, example: 'StrongPass123' })
  @IsString()
  @MinLength(8)
  @MaxLength(64)
  currentPassword: string;

  @ApiProperty({ minLength: 8, example: 'NewStrongPass456' })
  @IsString()
  @MinLength(8)
  @MaxLength(64)
  @Matches(/^(?=.*[A-Za-z])(?=.*\d).+$/, {
    message: 'New password must include at least one letter and one number.',
  })
  newPassword: string;
}
