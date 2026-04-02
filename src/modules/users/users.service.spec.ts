import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Role } from '../../common/enums/role.enum';
import { UserStatus } from '../../common/enums/user-status.enum';
import { PrismaService } from '../../prisma/prisma.service';
import { UsersService } from './users.service';

describe('UsersService', () => {
  let service: UsersService;

  const prismaMock = {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const moduleRef = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();

    service = moduleRef.get(UsersService);
  });

  it('creates user when email is unique', async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);
    prismaMock.user.create.mockResolvedValue({
      id: 'u1',
      email: 'analyst@test.com',
      name: 'Analyst',
      role: Role.ANALYST,
      status: UserStatus.ACTIVE,
      createdAt: new Date(),
    });

    const result = await service.create({
      email: 'analyst@test.com',
      password: 'StrongPass123',
      name: 'Analyst',
      role: Role.ANALYST,
      status: UserStatus.ACTIVE,
    });

    expect(result.email).toBe('analyst@test.com');
    expect(prismaMock.user.create).toHaveBeenCalled();
  });

  it('throws conflict when email already exists', async () => {
    prismaMock.user.findUnique.mockResolvedValue({ id: 'u1' });

    await expect(
      service.create({
        email: 'exists@test.com',
        password: 'StrongPass123',
        name: 'Exists',
        role: Role.ANALYST,
      }),
    ).rejects.toThrow(ConflictException);
  });

  it('throws when updating missing user', async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);
    await expect(service.update('missing-id', { name: 'x' })).rejects.toThrow(
      NotFoundException,
    );
  });
});
