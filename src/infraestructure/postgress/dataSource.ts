import { ConfigService } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { DataSource, DataSourceOptions } from 'typeorm';
import { join } from 'path';
import { config } from 'dotenv';

// Load environment variables for CLI usage
config();

// Base configuration shared between app and CLI
const baseConfig: DataSourceOptions = {
  type: 'postgres',
  host: process.env.POSTGRES_HOST || 'localhost',
  port: parseInt(process.env.POSTGRES_PORT || '5432', 10),
  username: process.env.POSTGRES_USER || 'postgres',
  password: process.env.POSTGRES_PASSWORD || 'postgres',
  database: process.env.POSTGRES_DB || 'postgres',
  migrations: [join(__dirname, '../../migrations/**/*.{ts,js}')],
  migrationsTableName: 'migrations_history',
  entities: [join(__dirname, '../../**/*.entity.{ts,js}')],
};

/**
 * TypeORM configuration factory using NestJS ConfigService
 *
 * This function creates a TypeORM configuration with the following features:
 * - Environment-specific settings from ConfigService
 * - Production-optimized logging
 * - Resilience settings for connection retries
 * - Automatic entity loading
 *
 * @param configService - NestJS ConfigService for accessing configuration values
 * @returns TypeORM configuration options
 */
export const getTypeOrmConfig = (
  configService: ConfigService,
): TypeOrmModuleOptions => {
  const isProduction = configService.get('NODE_ENV') === 'production';

  return {
    ...baseConfig,
    host: configService.get('POSTGRES_HOST') || baseConfig.host,
    port:
      parseInt(configService.get('POSTGRES_PORT'), 10) ||
      (baseConfig.port as number),
    username: configService.get('POSTGRES_USER') || baseConfig.username,
    password: configService.get('POSTGRES_PASSWORD') || baseConfig.password,
    database: String(configService.get('POSTGRES_DB') || baseConfig.database),
    autoLoadEntities: true, // Automatically loads entities from imports
    synchronize: false, // Disable auto-schema synchronization (use migrations instead)
    migrationsRun: true, // Automatically run migrations on application start
    logging: isProduction
      ? ['error', 'warn', 'migration'] // Production: Only log important events
      : ['error', 'warn', 'migration', 'query'], // Development: Include query logging
    logger: 'advanced-console', // Use detailed console logger
    retryAttempts: 5, // Number of connection retry attempts
    retryDelay: 3000, // Delay between retries in milliseconds (3 seconds)
  };
};

export const AppDataSource = new DataSource({
  ...baseConfig,
});
