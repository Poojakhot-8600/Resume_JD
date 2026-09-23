import '../utils/dns-fix';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const globalForPrisma = globalThis as unknown as {
  prisma?: ExtendedPrismaClient;
  pool?: Pool;
};

export const pool =
  globalForPrisma.pool ??
  new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl:
      process.env.DATABASE_URL &&
      !process.env.DATABASE_URL.includes('localhost') &&
      !process.env.DATABASE_URL.includes('127.0.0.1')
        ? { rejectUnauthorized: false }
        : undefined,
    connectionTimeoutMillis: 10000,
    idleTimeoutMillis: 30000,
    max: 10,
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.pool = pool;
}

const adapter = new PrismaPg(pool);

const createPrismaClient = () => {
  const basePrisma = new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

  return basePrisma.$extends({
    result: {
      candidate: {
        name: {
          needs: { fname: true, lname: true },
          compute(c) {
            return `${c.fname} ${c.lname}`.trim();
          },
        },
      },
      job: {
        parsedJDData: {
          needs: {
            skills: true,
            mustHave: true,
            goodToHave: true,
            experience: true,
            seniority: true,
            topics: true,
            weights: true,
          },
          compute(j) {
            return {
              skills: j.skills || [],
              mustHave: j.mustHave || [],
              goodToHave: j.goodToHave || [],
              experience: j.experience || '',
              seniority: j.seniority || '',
              topics: j.topics || [],
              weights: j.weights || {},
            };
          },
        },
      },
    },
  });
};

type ExtendedPrismaClient = ReturnType<typeof createPrismaClient>;

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
