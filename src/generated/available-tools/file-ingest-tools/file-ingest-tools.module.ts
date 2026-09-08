import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { fileIngestApiControllers } from '@available-tools/file-ingest-tools/file-ingest-api';
import {
    AzaadtoolWorker,
    AZAADTOOL_QUEUE,
} from '@available-tools/file-ingest-tools/file-ingest-worker/azaadtool-3.worker';

@Module({
    imports: [
        BullModule.forRoot({
            connection: {
                host: process.env.QUEUE_REDIS_HOST ?? '127.0.0.1',
                port: Number.parseInt(
                    process.env.QUEUE_REDIS_PORT ?? '6379',
                    10,
                ),
                username: process.env.QUEUE_REDIS_USERNAME || undefined,
                password: process.env.QUEUE_REDIS_PASSWORD || undefined,
                db: Number.parseInt(process.env.QUEUE_REDIS_DB ?? '0', 10),
                maxRetriesPerRequest: null,
            },
        }),
        BullModule.registerQueue({ name: AZAADTOOL_QUEUE }),
    ],
    controllers: [...fileIngestApiControllers],
    providers: [AzaadtoolWorker],
    exports: [],
})
export class FileIngestToolsModule {}
