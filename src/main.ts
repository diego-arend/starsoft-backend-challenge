import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { MetricsInterceptor } from './interceptors/metrics.interceptor';
import initTracing from './tracing';
import { ValidationPipe, Logger } from '@nestjs/common';
import { getDataSourceToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

// Initialize tracing before anything else
initTracing();

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const logger = new Logger('Database');

  // Apply metrics interceptor globally
  const metricsInterceptor = app.get(MetricsInterceptor);
  app.useGlobalInterceptors(metricsInterceptor);

  app.useGlobalPipes(new ValidationPipe());

  // Simplified migration check
  try {
    const dataSource = app.get<DataSource>(getDataSourceToken());
    await dataSource.runMigrations();
    logger.log('Database migrations applied successfully');
  } catch (error) {
    logger.error(`Failed to run migrations: ${error.message}`);
    if (process.env.NODE_ENV === 'production') {
      // In production, fail if migrations cannot be applied
      process.exit(1);
    }
  }

  // Swagger configuration
  const config = new DocumentBuilder()
    .setTitle('NestJS Observability API')
    .setDescription(
      'API with complete monitoring: Prometheus, Grafana, and Tempo',
    )
    .setVersion('1.0')
    .addTag('metrics', 'Endpoints related to metrics and observability')
    .addTag('users', 'User operations')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api-docs', app, document);

  await app.listen(process.env.PORT);
  console.log(`Application is running on: ${await app.getUrl()}`);
}
bootstrap();
