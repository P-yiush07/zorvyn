import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '../enums/role.enum';
import { RolesGuard } from './roles.guard';

describe('RolesGuard', () => {
  const reflectorMock = {
    getAllAndOverride: jest.fn(),
  } as unknown as Reflector;

  const buildContext = (role?: Role): ExecutionContext =>
    ({
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: () => ({
        getRequest: () => ({ user: role ? { role } : undefined }),
      }),
    }) as unknown as ExecutionContext;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('allows request when route has no required roles', () => {
    reflectorMock.getAllAndOverride = jest.fn().mockReturnValue(undefined);
    const guard = new RolesGuard(reflectorMock);

    expect(guard.canActivate(buildContext())).toBe(true);
  });

  it('allows request when user has required role', () => {
    reflectorMock.getAllAndOverride = jest.fn().mockReturnValue([Role.ADMIN]);
    const guard = new RolesGuard(reflectorMock);

    expect(guard.canActivate(buildContext(Role.ADMIN))).toBe(true);
  });

  it('throws forbidden when role is missing', () => {
    reflectorMock.getAllAndOverride = jest.fn().mockReturnValue([Role.ADMIN]);
    const guard = new RolesGuard(reflectorMock);

    expect(() => guard.canActivate(buildContext(Role.VIEWER))).toThrow(
      ForbiddenException,
    );
  });
});
