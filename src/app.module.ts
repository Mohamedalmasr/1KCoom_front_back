import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { BlogModule } from './blog/blog.module';
import { ContactModule } from './contact/contact.module';
import { ProjectsModule } from './projects/projects.module';
import { SessionsModule } from './sessions/sessions.module';


@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const parsePort = (value?: string): number => {
          if (!value) {
            return 5432;
          }

          const parsed = Number.parseInt(value, 10);
          return Number.isNaN(parsed) ? 5432 : parsed;
        };

        const shouldUseSsl = (value?: string): boolean => {
          if (!value) {
            return false;
          }

          const normalized = value.trim().toLowerCase();
          return normalized === 'true' || normalized === '1' || normalized === 'yes';
        };

        const ssl = shouldUseSsl(config.get<string>('DB_SSL'))
          ? { rejectUnauthorized: false }
          : false;

        return {
          type: 'postgres' as const,
          host: config.get<string>('DB_HOST', 'localhost'),
          port: parsePort(config.get<string>('DB_PORT')),
          username: config.get<string>('DB_USER'),
          password: config.get<string>('DB_PASSWORD'),
          database: config.get<string>('DB_NAME'),
          autoLoadEntities: true,
          synchronize: false,
          ssl,
        };
      },
    }),
    UsersModule,
    AuthModule,
    BlogModule,
    ContactModule,
    ProjectsModule,
    SessionsModule,
   
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
