import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { RecordNotFoundException } from '../../common/exceptions/record-not-found.exception';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateRecordDto } from './dto/create-record.dto';
import { QueryRecordDto } from './dto/query-record.dto';
import { UpdateRecordDto } from './dto/update-record.dto';

@Injectable()
export class RecordsService {
  constructor(private readonly prisma: PrismaService) {}

  private getActiveRecordsWhere(): Prisma.FinancialRecordWhereInput {
    return {
      OR: [{ deletedAt: null }, { deletedAt: { isSet: false } }],
    };
  }

  private validateDateRange(query: QueryRecordDto): void {
    if (query.startDate && query.endDate) {
      const start = new Date(query.startDate);
      const end = new Date(query.endDate);

      if (start > end) {
        throw new BadRequestException(
          'startDate must be before or equal to endDate.',
        );
      }
    }
  }

  async create(createRecordDto: CreateRecordDto, createdById: string) {
    return this.prisma.financialRecord.create({
      data: {
        amount: createRecordDto.amount,
        type: createRecordDto.type,
        category: createRecordDto.category,
        date: new Date(createRecordDto.date),
        notes: createRecordDto.notes,
        createdById,
        updatedById: createdById,
      },
    });
  }

  async findAll(query: QueryRecordDto) {
    this.validateDateRange(query);

    const where: Prisma.FinancialRecordWhereInput = {
      ...this.getActiveRecordsWhere(),
      ...(query.type ? { type: query.type } : {}),
      ...(query.category ? { category: query.category } : {}),
      ...(query.startDate || query.endDate
        ? {
            date: {
              ...(query.startDate ? { gte: new Date(query.startDate) } : {}),
              ...(query.endDate ? { lte: new Date(query.endDate) } : {}),
            },
          }
        : {}),
    };

    const hasPagination = query.page !== undefined || query.limit !== undefined;

    if (!hasPagination) {
      return this.prisma.financialRecord.findMany({
        where,
        orderBy: { date: 'desc' },
      });
    }

    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.financialRecord.findMany({
        where,
        skip,
        take: limit,
        orderBy: { date: 'desc' },
      }),
      this.prisma.financialRecord.count({ where }),
    ]);

    return {
      data,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string) {
    const record = await this.prisma.financialRecord.findFirst({
      where: { id, ...this.getActiveRecordsWhere() },
    });
    if (!record) {
      throw new RecordNotFoundException();
    }

    return record;
  }

  async update(id: string, updateRecordDto: UpdateRecordDto, actorId: string) {
    await this.findOne(id);

    return this.prisma.financialRecord.update({
      where: { id },
      data: {
        ...updateRecordDto,
        ...(updateRecordDto.date
          ? { date: new Date(updateRecordDto.date) }
          : {}),
        updatedById: actorId,
      },
    });
  }

  async remove(id: string, actorId: string) {
    await this.findOne(id);

    return this.prisma.financialRecord.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        deletedById: actorId,
        updatedById: actorId,
      },
    });
  }
}
