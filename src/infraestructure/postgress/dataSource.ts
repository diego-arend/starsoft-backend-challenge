import { ConfigService } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { DataSource, DataSourceOptions } from 'typeorm';
import { join } from 'path';
import { config } from 'dotenv';

// Load environment variables for CLI usage
config();

/**
 * Gets environment variable or throws an error if it's not defined
 * @param key Environment variable name
 * @returns Environment variable value
 * @throws Error if environment variable is not defined
 */
function getEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Environment variable ${key} is not defined`);
  }
  return value;
}

// Base configuration shared between app and CLI
const baseConfig: DataSourceOptions = {
  type: 'postgres',
  host: getEnv('POSTGRES_HOST'),
  port: parseInt(getEnv('POSTGRES_PORT'), 10),
  username: getEnv('POSTGRES_USER'),
  password: getEnv('POSTGRES_PASSWORD'),
  database: getEnv('POSTGRES_DB'),
  migrations: [join(__dirname, '../../migrations/**/*.{ts,js}')],
  migrationsTableName: 'migrations_history',
  entities: [join(__dirname, '../../**/*.entity.{ts,js}')],
};

/**
 * TypeORM configuration factory using NestJS ConfigService
 */
export const getTypeOrmConfig = (
  configService: ConfigService,
): TypeOrmModuleOptions => {
  const isProduction = configService.get('NODE_ENV') === 'production';

  // Get required environment variables
  const host = configService.getOrThrow('POSTGRES_HOST');
  const port = parseInt(configService.getOrThrow('POSTGRES_PORT'), 10);
  const username = configService.getOrThrow('POSTGRES_USER');
  const password = configService.getOrThrow('POSTGRES_PASSWORD');
  const database = configService.getOrThrow('POSTGRES_DB');

  return {
    ...baseConfig,
    host,
    port,
    username,
    password,
    database,
    autoLoadEntities: true,
    synchronize: false,
    migrationsRun: true,
    logging: isProduction
      ? ['error', 'warn', 'migration']
      : ['error', 'warn', 'migration', 'query'],
    logger: 'advanced-console',
    retryAttempts: 5,
    retryDelay: 3000,
  };
};

export const AppDataSource = new DataSource({
  ...baseConfig,
});
