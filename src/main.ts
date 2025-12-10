import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { setupSwagger } from './config/swagger.config';
import * as bodyParser from 'body-parser';
import { ValidationPipe, Logger } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log'],
  });

  app.enableCors({
    origin: '*',
    allowedHeaders: 'Content-Type, Authorization, x-api-key',
  });

  // Protect webhook route
  app.use(
    '/wallet/paystack/webhook',
    bodyParser.json({ limit: '200kb' }),
  );

  // DTO validation globally
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  
  app.useGlobalFilters(new HttpExceptionFilter());
  setupSwagger(app);

  const prismaService = app.get(PrismaService);
  await app.enableShutdownHooks();


  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  Logger.log(`Server running at http://localhost:${port}`);
}

bootstrap();
