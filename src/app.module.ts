import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GeneratedAuthModule } from './auth/auth.module';
import { configLoaders } from './core/config';
import { typeormConfig } from './core/database/typeorm.config';
import { VulcanModule } from './vulcan/vulcan.module';
import { GeneratedIngestApiModule } from '@available-tools/generated-ingest-api.module';
import { GeneratedApiGenerateApiModule } from '@available-tools/generated-api-generate-api.module';
import { GeneratedCrudApiModule } from '@generated-crud/generated-crud-api.module';

@Module({
    imports: [
        ConfigModule.forRoot({
            isGlobal: true,
            envFilePath: ['.env.local', '.env'],
            load: [...configLoaders],
        }),
        TypeOrmModule.forRoot(typeormConfig),
        GeneratedAuthModule,
        VulcanModule,
        GeneratedIngestApiModule,
        GeneratedApiGenerateApiModule,
        GeneratedCrudApiModule,
    ],
})
export class AppModule {}
