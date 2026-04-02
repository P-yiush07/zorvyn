import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { StringValue } from 'ms';
import { UserInactiveException } from '../../common/exceptions/user-inactive.exception';
import { PrismaService } from '../../prisma/prisma.service';
import { ChangePasswordDto } from './dto/change-password.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { RegisterDto } from './dto/register.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async register(registerDto: RegisterDto) {
    const existing = await this.prisma.user.findUnique({
      where: { email: registerDto.email },
    });

    if (existing) {
      throw new ConflictException('Email already in use.');
    }

    const usersCount = await this.prisma.user.count();
    if (usersCount > 0 && (registerDto.role ?? 'ADMIN') === 'ADMIN') {
      throw new ForbiddenException(
        'Admin registration is only allowed for initial bootstrap.',
      );
    }

    const passwordHash = await bcrypt.hash(registerDto.password, 10);
    const role = usersCount === 0 ? 'ADMIN' : (registerDto.role ?? 'VIEWER');

    const user = await this.prisma.user.create({
      data: {
        email: registerDto.email,
        passwordHash,
        name: registerDto.name,
        role,
        status: 'ACTIVE',
      },
    });

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      status: user.status,
    };
  }

  async login(loginDto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: loginDto.email },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials.');
    }

    const isPasswordValid = await bcrypt.compare(
      loginDto.password,
      user.passwordHash,
    );
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials.');
    }

    if (user.status !== 'ACTIVE') {
      throw new UserInactiveException();
    }

    const tokens = await this.issueTokens(user.id, user.email, user.role);
    const refreshTokenHash = await bcrypt.hash(tokens.refreshToken, 10);
    await this.prisma.user.update({
      where: { id: user.id },
      data: { refreshTokenHash },
    });

    return {
      ...tokens,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        status: user.status,
      },
    };
  }

  async refreshToken(refreshTokenDto: RefreshTokenDto) {
    const refreshSecret = this.configService.get<string>(
      'REFRESH_JWT_SECRET',
      'dev_refresh_secret_change_me',
    );

    let payload: { sub: string; email: string; role: string };
    try {
      payload = await this.jwtService.verifyAsync(
        refreshTokenDto.refreshToken,
        {
          secret: refreshSecret,
        },
      );
    } catch {
      throw new UnauthorizedException('Invalid refresh token.');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
    });
    if (!user || user.status !== 'ACTIVE' || !user.refreshTokenHash) {
      throw new UnauthorizedException('Refresh session is invalid.');
    }

    const isMatch = await bcrypt.compare(
      refreshTokenDto.refreshToken,
      user.refreshTokenHash,
    );
    if (!isMatch) {
      throw new UnauthorizedException('Refresh session is invalid.');
    }

    const tokens = await this.issueTokens(user.id, user.email, user.role);
    const refreshTokenHash = await bcrypt.hash(tokens.refreshToken, 10);
    await this.prisma.user.update({
      where: { id: user.id },
      data: { refreshTokenHash },
    });

    return tokens;
  }

  async changePassword(userId: string, changePasswordDto: ChangePasswordDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new UnauthorizedException('User not found.');
    }

    const currentPasswordMatches = await bcrypt.compare(
      changePasswordDto.currentPassword,
      user.passwordHash,
    );
    if (!currentPasswordMatches) {
      throw new UnauthorizedException('Current password is incorrect.');
    }

    if (changePasswordDto.currentPassword === changePasswordDto.newPassword) {
      throw new BadRequestException(
        'New password must be different from current password.',
      );
    }

    const passwordHash = await bcrypt.hash(changePasswordDto.newPassword, 10);
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        refreshTokenHash: null,
      },
    });

    return { message: 'Password changed successfully. Please login again.' };
  }

  private async issueTokens(userId: string, email: string, role: string) {
    const accessToken = await this.jwtService.signAsync({
      sub: userId,
      email,
      role,
    });

    const refreshSecret = this.configService.get<string>(
      'REFRESH_JWT_SECRET',
      'dev_refresh_secret_change_me',
    );
    const refreshExpiresIn = this.configService.get<string>(
      'REFRESH_JWT_EXPIRES_IN',
      '7d',
    );

    const refreshToken = await this.jwtService.signAsync(
      {
        sub: userId,
        email,
        role,
      },
      {
        secret: refreshSecret,
        expiresIn: refreshExpiresIn as StringValue,
      },
    );

    return { accessToken, refreshToken };
  }
}
