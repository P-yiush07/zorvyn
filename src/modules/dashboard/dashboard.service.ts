import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  private getActiveRecordsWhere(): Prisma.FinancialRecordWhereInput {
    return {
      OR: [{ deletedAt: null }, { deletedAt: { isSet: false } }],
    };
  }

  async getSummary() {
    const records = await this.prisma.financialRecord.findMany({
      where: this.getActiveRecordsWhere(),
    });

    const totalIncome = records
      .filter((record) => record.type === 'INCOME')
      .reduce((sum, record) => sum + record.amount, 0);

    const totalExpenses = records
      .filter((record) => record.type === 'EXPENSE')
      .reduce((sum, record) => sum + record.amount, 0);

    return {
      totalIncome,
      totalExpenses,
      netBalance: totalIncome - totalExpenses,
      recordCount: records.length,
    };
  }

  async getCategoryTotals() {
    const records = await this.prisma.financialRecord.findMany({
      where: this.getActiveRecordsWhere(),
    });

    const categoryMap = records.reduce<Record<string, number>>(
      (acc, record) => {
        acc[record.category] = (acc[record.category] ?? 0) + record.amount;
        return acc;
      },
      {},
    );

    return Object.entries(categoryMap).map(([category, total]) => ({
      category,
      total,
    }));
  }

  async getRecentActivity(limit = 10) {
    return this.prisma.financialRecord.findMany({
      where: this.getActiveRecordsWhere(),
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  async getTrends(range: 'weekly' | 'monthly') {
    const records = await this.prisma.financialRecord.findMany({
      where: this.getActiveRecordsWhere(),
    });
    const trendMap = new Map<string, { income: number; expense: number }>();

    records.forEach((record) => {
      const date = new Date(record.date);
      const key =
        range === 'weekly'
          ? this.getWeekKey(date)
          : `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;

      const current = trendMap.get(key) ?? { income: 0, expense: 0 };

      if (record.type === 'INCOME') {
        current.income += record.amount;
      } else {
        current.expense += record.amount;
      }

      trendMap.set(key, current);
    });

    return Array.from(trendMap.entries())
      .map(([period, values]) => ({
        period,
        income: values.income,
        expense: values.expense,
        net: values.income - values.expense,
      }))
      .sort((a, b) => a.period.localeCompare(b.period));
  }

  private getWeekKey(date: Date): string {
    const tempDate = new Date(
      Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
    );
    const day = tempDate.getUTCDay() || 7;
    tempDate.setUTCDate(tempDate.getUTCDate() + 4 - day);

    const yearStart = new Date(Date.UTC(tempDate.getUTCFullYear(), 0, 1));
    const weekNo = Math.ceil(
      ((tempDate.getTime() - yearStart.getTime()) / 86400000 + 1) / 7,
    );

    return `${tempDate.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
  }
}
