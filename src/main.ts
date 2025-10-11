import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

function resolveCorsOrigins(): (string | RegExp)[] | string | boolean {
  const raw = process.env.FRONTEND_ORIGINS;
  if (!raw) {
    return ['http://localhost:5173', 'http://127.0.0.1:5173'];
  }
  return raw.split(',').map(o => o.trim()).filter(Boolean);
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors({ origin: resolveCorsOrigins() });

  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    transformOptions: { enableImplicitConversion: true },
  }));

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
