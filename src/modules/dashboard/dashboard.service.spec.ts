import { Test } from '@nestjs/testing';
import { RecordType } from '../../common/enums/record-type.enum';
import { PrismaService } from '../../prisma/prisma.service';
import { DashboardService } from './dashboard.service';

describe('DashboardService', () => {
  let service: DashboardService;

  const prismaMock = {
    financialRecord: {
      findMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const moduleRef = await Test.createTestingModule({
      providers: [
        DashboardService,
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();

    service = moduleRef.get(DashboardService);
  });

  it('calculates summary totals correctly', async () => {
    prismaMock.financialRecord.findMany.mockResolvedValue([
      {
        amount: 1000,
        type: RecordType.INCOME,
        category: 'Salary',
        date: new Date(),
        createdAt: new Date(),
      },
      {
        amount: 200,
        type: RecordType.EXPENSE,
        category: 'Food',
        date: new Date(),
        createdAt: new Date(),
      },
    ]);

    const result = await service.getSummary();

    expect(result.totalIncome).toBe(1000);
    expect(result.totalExpenses).toBe(200);
    expect(result.netBalance).toBe(800);
  });

  it('returns trends grouped by period', async () => {
    prismaMock.financialRecord.findMany.mockResolvedValue([
      {
        amount: 500,
        type: RecordType.INCOME,
        category: 'Salary',
        date: new Date('2026-04-01'),
      },
      {
        amount: 100,
        type: RecordType.EXPENSE,
        category: 'Food',
        date: new Date('2026-04-02'),
      },
    ]);

    const result = await service.getTrends('monthly');

    expect(result[0]).toHaveProperty('period');
    expect(result[0]).toHaveProperty('net');
  });
});
