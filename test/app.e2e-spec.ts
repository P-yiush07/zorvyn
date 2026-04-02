import {
  INestApplication,
  ValidationPipe,
  VersioningType,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { LoggingInterceptor } from '../src/common/interceptors/logging.interceptor';
import { ResponseInterceptor } from '../src/common/interceptors/response.interceptor';
import { PrismaService } from '../src/prisma/prisma.service';

type UserRecord = {
  id: string;
  email: string;
  passwordHash: string;
  name: string;
  role: 'VIEWER' | 'ANALYST' | 'ADMIN';
  status: 'ACTIVE' | 'INACTIVE';
};

type FinancialRecord = {
  id: string;
  amount: number;
  type: 'INCOME' | 'EXPENSE';
  category: string;
  date: Date;
  notes?: string;
  createdById: string;
  updatedById?: string;
  deletedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

class PrismaServiceMock {
  users: UserRecord[] = [];
  records: FinancialRecord[] = [];

  user = {
    findUnique: jest.fn(
      ({ where }: { where: { id?: string; email?: string } }) => {
        if (where.email) {
          return this.users.find((u) => u.email === where.email) ?? null;
        }
        if (where.id) {
          return this.users.find((u) => u.id === where.id) ?? null;
        }
        return null;
      },
    ),
    count: jest.fn(() => this.users.length),
    create: jest.fn(({ data }: { data: Omit<UserRecord, 'id'> }) => {
      const user: UserRecord = { id: `${this.users.length + 1}`, ...data };
      this.users.push(user);
      return user;
    }),
    findMany: jest.fn(() => this.users),
    update: jest.fn(
      ({
        where,
        data,
      }: {
        where: { id: string };
        data: Partial<UserRecord>;
      }) => {
        const idx = this.users.findIndex((u) => u.id === where.id);
        if (idx >= 0) {
          this.users[idx] = { ...this.users[idx], ...data };
        }
        return this.users[idx];
      },
    ),
  };

  financialRecord = {
    create: jest.fn(
      ({
        data,
      }: {
        data: Omit<FinancialRecord, 'id' | 'createdAt' | 'updatedAt'>;
      }) => {
        const record: FinancialRecord = {
          id: `${this.records.length + 1}`,
          createdAt: new Date(),
          updatedAt: new Date(),
          ...data,
        };
        this.records.push(record);
        return record;
      },
    ),
    findMany: jest.fn(() => this.records.filter((r) => !r.deletedAt)),
    count: jest.fn(() => this.records.filter((r) => !r.deletedAt).length),
    findFirst: jest.fn(
      ({ where }: { where: { id?: string } }) =>
        this.records.find((r) => r.id === where.id && !r.deletedAt) ?? null,
    ),
    update: jest.fn(
      ({
        where,
        data,
      }: {
        where: { id: string };
        data: Partial<FinancialRecord>;
      }) => {
        const idx = this.records.findIndex((r) => r.id === where.id);
        if (idx >= 0) {
          this.records[idx] = {
            ...this.records[idx],
            ...data,
            updatedAt: new Date(),
          };
        }
        return this.records[idx];
      },
    ),
  };

  async $connect() {
    return Promise.resolve();
  }

  async $disconnect() {
    return Promise.resolve();
  }
}

describe('AppController (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useClass(PrismaServiceMock)
      .compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: { enableImplicitConversion: true },
      }),
    );
    app.useGlobalFilters(new HttpExceptionFilter());
    app.useGlobalInterceptors(new LoggingInterceptor());
    app.useGlobalInterceptors(new ResponseInterceptor());
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('runs auth to record smoke flow', async () => {
    const server = app.getHttpServer() as Parameters<typeof request>[0];

    const registerRes = await request(server)
      .post('/api/v1/auth/register')
      .send({
        email: 'admin@finance.local',
        password: 'StrongPass123',
        name: 'Admin',
      })
      .expect(201);

    const registerBody = registerRes.body as { data: { email: string } };
    expect(registerBody.data.email).toBe('admin@finance.local');

    const loginRes = await request(server)
      .post('/api/v1/auth/login')
      .send({
        email: 'admin@finance.local',
        password: 'StrongPass123',
      })
      .expect(200);

    const loginBody = loginRes.body as { data: { accessToken: string } };
    const token = loginBody.data.accessToken;
    expect(token).toBeDefined();

    await request(server)
      .post('/api/v1/records')
      .set('Authorization', `Bearer ${token}`)
      .send({
        amount: 1000,
        type: 'INCOME',
        category: 'Salary',
        date: '2026-04-01T00:00:00.000Z',
      })
      .expect(201);

    const summaryRes = await request(server)
      .get('/api/v1/dashboard/summary')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    const summaryBody = summaryRes.body as { data: { totalIncome: number } };
    expect(summaryBody.data.totalIncome).toBe(1000);
  });
});
