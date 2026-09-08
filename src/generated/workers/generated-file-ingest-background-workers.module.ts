import { Module } from '@nestjs/common';
import { FileIngestToolsModule } from '@available-tools/file-ingest-tools/file-ingest-tools.module';
import { WorkerQueueInfrastructureModule } from '../../workers/worker-queue-infrastructure.module';

/**
 * File-ingest BullMQ processors (codegen):
 * - AzaadtoolWorker → available-tools/file-ingest-tools/file-ingest-worker/azaadtool-3.worker.ts
 */

@Module({
    imports: [WorkerQueueInfrastructureModule, FileIngestToolsModule],
    providers: [],
    exports: [FileIngestToolsModule],
})
export class GeneratedFileIngestBackgroundWorkersModule {}
