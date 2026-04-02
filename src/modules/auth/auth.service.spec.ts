import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';
import { Role } from '../../common/enums/role.enum';
import { UserStatus } from '../../common/enums/user-status.enum';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;

  const prismaMock = {
    user: {
      findUnique: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  };

  const jwtMock = {
    signAsync: jest.fn().mockResolvedValue('token123'),
    verifyAsync: jest.fn(),
  };

  const configMock = {
    get: jest.fn((key: string) => {
      if (key === 'REFRESH_JWT_SECRET') return 'refresh_secret';
      if (key === 'REFRESH_JWT_EXPIRES_IN') return '7d';
      return undefined;
    }),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const moduleRef = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: JwtService, useValue: jwtMock },
        { provide: ConfigService, useValue: configMock },
      ],
    }).compile();

    service = moduleRef.get(AuthService);
  });

  it('logs in active user with valid credentials', async () => {
    const password = 'StrongPass123';
    const hash = await bcrypt.hash(password, 10);

    prismaMock.user.findUnique.mockResolvedValue({
      id: 'u1',
      email: 'admin@test.com',
      passwordHash: hash,
      role: Role.ADMIN,
      status: UserStatus.ACTIVE,
      name: 'Admin',
    });

    const result = await service.login({ email: 'admin@test.com', password });

    expect(result.accessToken).toBe('token123');
    expect(result.refreshToken).toBe('token123');
    expect(jwtMock.signAsync).toHaveBeenCalledTimes(2);
    expect(prismaMock.user.update).toHaveBeenCalled();
  });

  it('throws for inactive account on login', async () => {
    const hash = await bcrypt.hash('StrongPass123', 10);

    prismaMock.user.findUnique.mockResolvedValue({
      id: 'u1',
      email: 'viewer@test.com',
      passwordHash: hash,
      role: Role.VIEWER,
      status: UserStatus.INACTIVE,
      name: 'Viewer',
    });

    await expect(
      service.login({ email: 'viewer@test.com', password: 'StrongPass123' }),
    ).rejects.toThrow(ForbiddenException);
  });

  it('rejects bad credentials', async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);

    await expect(
      service.login({ email: 'none@test.com', password: 'abc12345' }),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('refreshes token for valid refresh session', async () => {
    const refreshToken = 'token123';
    const refreshHash = await bcrypt.hash(refreshToken, 10);
    jwtMock.verifyAsync.mockResolvedValue({
      sub: 'u1',
      email: 'admin@test.com',
      role: Role.ADMIN,
    });

    prismaMock.user.findUnique.mockResolvedValue({
      id: 'u1',
      email: 'admin@test.com',
      passwordHash: 'hash',
      role: Role.ADMIN,
      status: UserStatus.ACTIVE,
      refreshTokenHash: refreshHash,
      name: 'Admin',
    });

    const result = await service.refreshToken({ refreshToken });
    expect(result.accessToken).toBe('token123');
    expect(prismaMock.user.update).toHaveBeenCalled();
  });
});
