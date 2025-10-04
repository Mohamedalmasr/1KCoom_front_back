// src/main.ts
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

function resolveCorsOrigins(): (string | RegExp)[] | string | boolean {
  const raw = process.env.FRONTEND_ORIGINS;
  if (!raw) {
    // لو مفيش ENV هنسمح للديفولت بتاع الفيت
    return ['http://localhost:5173', 'http://127.0.0.1:5173'];
  }

  return raw
    .split(',')
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: resolveCorsOrigins(),
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,             // يشيل الحقول الزيادة
      forbidNonWhitelisted: true,  // يرمي خطأ لو فيه حقول زيادة جاية في البودي
      transform: true,             // يحوّل الأنواع بناءً على الـ DTO
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
