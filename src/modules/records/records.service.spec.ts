import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { RecordType } from '../../common/enums/record-type.enum';
import { PrismaService } from '../../prisma/prisma.service';
import { RecordsService } from './records.service';

describe('RecordsService', () => {
  let service: RecordsService;

  const prismaMock = {
    financialRecord: {
      create: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const moduleRef = await Test.createTestingModule({
      providers: [
        RecordsService,
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();

    service = moduleRef.get(RecordsService);
  });

  it('returns paginated records', async () => {
    prismaMock.financialRecord.findMany.mockResolvedValue([
      { id: 'r1', amount: 100 },
    ]);
    prismaMock.financialRecord.count.mockResolvedValue(1);

    const result = (await service.findAll({ page: 1, limit: 20 })) as {
      meta: { total: number };
      data: Array<{ id: string; amount: number }>;
    };

    expect(result.meta.total).toBe(1);
    expect(result.data).toHaveLength(1);
  });

  it('returns all records when query params are not provided', async () => {
    prismaMock.financialRecord.findMany.mockResolvedValue([
      { id: 'r1', amount: 100 },
      { id: 'r2', amount: 200 },
    ]);

    const result = (await service.findAll({})) as Array<{
      id: string;
      amount: number;
    }>;

    expect(result).toHaveLength(2);
    expect(prismaMock.financialRecord.count).not.toHaveBeenCalled();
  });

  it('throws bad request for invalid date range', async () => {
    await expect(
      service.findAll({
        startDate: '2026-05-01T00:00:00.000Z',
        endDate: '2026-04-01T00:00:00.000Z',
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('throws not found for missing record', async () => {
    prismaMock.financialRecord.findFirst.mockResolvedValue(null);
    await expect(service.findOne('missing')).rejects.toThrow(NotFoundException);
  });

  it('creates record for admin action', async () => {
    prismaMock.financialRecord.create.mockResolvedValue({
      id: 'r1',
      amount: 250,
      type: RecordType.INCOME,
    });

    const result = await service.create(
      {
        amount: 250,
        type: RecordType.INCOME,
        category: 'Salary',
        date: new Date().toISOString(),
      },
      'u1',
    );

    expect(result.id).toBe('r1');
  });
});
