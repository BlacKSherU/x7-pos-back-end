// src/app.module.ts
import { Module } from '@nestjs/common';
import { ThrottlerModule } from '@nestjs/throttler';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LegacyRutSubscriber } from './platform-saas/companies/legacy-rut.subscriber';
import { validateEnv } from './config/environment';
import { EventEmitterModule } from '@nestjs/event-emitter';
import './database/pg-date-parser';
import './database/pg-int8-parser';

// Core & Platform Modules
import { AuthModule } from './auth/auth.module';
import { CoreModule } from './core/core.module';
import { PlatformSaasModule } from './platform-saas/platform-saas.module';
import { MailModule } from './mail/mail.module';
import { RealtimeModule } from './realtime/realtime.module';
import { OnboardingModule } from './onboarding/onboarding.module';
import { HealthModule } from './health/health.module';

// Business & Operations Modules
import { CommerceModule } from './commerce/commerce.module';
import { GrowthModule } from './growth/growth.module';
import { FinanceHrModule } from './finance-hr/finance-hr.module';
import { InventoryModule } from './inventory/inventory.module';
import { RestaurantOperationsModule } from './restaurant-operations/restaurant-operations.module';

@Module({
  imports: [
    // Sin una configuración válida (secretos, NODE_ENV, DB) la app no arranca.
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnv }),
    // Limits only apply where a handler opts in with ThrottlerGuard (public auth routes):
    // a global limit would throttle a whole restaurant sharing one IP.
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 60 }]),
    EventEmitterModule.forRoot(),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const useSSL = config.get('DB_SSL') === 'true';

        return {
          type: 'postgres',
          host: config.get('DB_HOST'),
          port: parseInt(config.get('DB_PORT', '5432')),
          username: config.get('DB_USERNAME'),
          password: config.get('DB_PASSWORD'),
          database: config.get('DB_NAME'),

          // Only print SQL queries when DB_LOGGING=true
          logging: config.get('DB_LOGGING') === 'true',

          // Automatic loading of all entities declared in each submodule (forFeature)
          autoLoadEntities: true,
          subscribers: [LegacyRutSubscriber],

          synchronize: false,
          // El esquema se cambia con migraciones (npm run migration:run), nunca al arrancar.
          migrations: [__dirname + '/database/migrations/*.js'],
          migrationsRun: false,
          ssl: useSSL ? { rejectUnauthorized: false } : false,
          extra: {
            ...(useSSL ? { ssl: { rejectUnauthorized: false } } : {}),
            max: 5,
            idleTimeoutMillis: 10000,
            connectionTimeoutMillis: 10000,
            prepare: false,
            statement_timeout: 10000,
          },
        };
      },
    }),
    // AccountPayableModule,
    HealthModule,
    AuthModule,
    OnboardingModule,
    CoreModule,
    InventoryModule,
    MailModule,
    RestaurantOperationsModule,
    PlatformSaasModule,
    CommerceModule,
    GrowthModule,
    FinanceHrModule,
    RealtimeModule,
  ],
})
export class AppModule {}
