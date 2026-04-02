import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTooManyRequestsResponse,
  ApiUnauthorizedResponse,
  ApiCreatedResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AuthService } from './auth.service';
import { ChangePasswordDto } from './dto/change-password.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { RegisterDto } from './dto/register.dto';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @ApiOperation({ summary: 'Register a user (first user becomes admin)' })
  @ApiBody({ type: RegisterDto })
  @ApiCreatedResponse({ description: 'User registered successfully.' })
  @ApiBadRequestResponse({ description: 'Invalid request payload.' })
  @ApiForbiddenResponse({ description: 'Admin bootstrap rules violated.' })
  @ApiTooManyRequestsResponse({
    description: 'Too many registration attempts.',
  })
  register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @Post('login')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login and receive JWT access token' })
  @ApiBody({ type: LoginDto })
  @ApiOkResponse({ description: 'Login successful.' })
  @ApiUnauthorizedResponse({ description: 'Invalid credentials.' })
  @ApiBadRequestResponse({ description: 'Invalid request payload.' })
  @ApiTooManyRequestsResponse({ description: 'Too many login attempts.' })
  login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Rotate and return new access/refresh tokens' })
  @ApiBody({ type: RefreshTokenDto })
  @ApiOkResponse({ description: 'Tokens refreshed successfully.' })
  @ApiUnauthorizedResponse({ description: 'Invalid refresh token.' })
  refresh(@Body() refreshTokenDto: RefreshTokenDto) {
    return this.authService.refreshToken(refreshTokenDto);
  }

  @Post('change-password')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Change current user password' })
  @ApiBody({ type: ChangePasswordDto })
  @ApiOkResponse({
    description: 'Password changed and existing refresh sessions invalidated.',
  })
  @ApiUnauthorizedResponse({
    description: 'Invalid token or current password mismatch.',
  })
  @ApiBadRequestResponse({ description: 'Invalid payload or weak password.' })
  changePassword(
    @Req() req: { user: { id: string } },
    @Body() changePasswordDto: ChangePasswordDto,
  ) {
    return this.authService.changePassword(req.user.id, changePasswordDto);
  }
}
