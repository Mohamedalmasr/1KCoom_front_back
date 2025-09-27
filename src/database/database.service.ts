import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Pool, QueryResult } from 'pg';

@Injectable()
export class DatabaseService implements OnModuleDestroy {
  private readonly pool: Pool;

  constructor(private readonly configService: ConfigService) {
    this.pool = new Pool({
      host: this.configService.get<string>('DB_HOST', 'localhost'),
      port: this.parseInt(this.configService.get<string>('DB_PORT', '5432'), 5432),
      user: this.configService.get<string>('DB_USER'),
      password: this.configService.get<string>('DB_PASSWORD'),
      database: this.configService.get<string>('DB_NAME'),
      ssl: this.shouldUseSsl()
        ? { rejectUnauthorized: false }
        : undefined,
    });
  }

  query<T = unknown>(text: string, params?: any[]): Promise<QueryResult<T>> {
    return this.pool.query<T>(text, params);
  }

  async onModuleDestroy(): Promise<void> {
    await this.pool.end();
  }

  private parseInt(value: string | undefined, fallback: number): number {
    if (!value) {
      return fallback;
    }

    const coerced = Number.parseInt(value, 10);
    return Number.isNaN(coerced) ? fallback : coerced;
  }

  private shouldUseSsl(): boolean {
    const raw = this.configService.get<string>('DB_SSL');
    if (!raw) {
      return false;
    }

    const normalized = raw.trim().toLowerCase();
    return normalized === 'true' || normalized === '1' || normalized === 'yes';
  }
}
