import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import { StructuredLoggerService } from './modules/common/logger/structured-logger.service';

async function bootstrap() {
  const logger = new StructuredLoggerService('Bootstrap');
  const app = await NestFactory.create(AppModule, {
    logger: new StructuredLoggerService('NestApplication'),
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT') || 3000;

  await app.listen(port, '0.0.0.0');
  logger.log(`WuzMind Cognitive Service is running on port ${port}`);
}
bootstrap();
