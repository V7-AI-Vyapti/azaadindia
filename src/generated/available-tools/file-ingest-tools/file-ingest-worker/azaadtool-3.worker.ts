import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Inject } from '@nestjs/common';
import { DataSource } from 'typeorm';
import type { Job } from 'bullmq';
import { bulk_insert_entity_records } from '@vyapti/core';
import { multiply } from '@vyapti/function-registry';
import {
    bindUpdateProcessStatus,
    getFileById,
    getFileMetaByFileId,
    PROCESS_STATUS,
    runWithProcessStatus,
} from '@vyapti/core/file-ingest-tool-utils';
import { downloadFileBuffer } from '@vyapti/file-storage';
import { readString } from '@vulcan/shared/utils/record-readers';

type AzaadtoolJobData = {
    process_id: number;
    file_id: number;
};

const AZAADTOOL_QUEUE = 'data_ingestion_azaadtool';
const AZAADTOOL_JOB = 'file_ingest_protocol_azaadtool_data';

@Processor(AZAADTOOL_QUEUE)
export class AzaadtoolWorker extends WorkerHost {
    constructor(
        @Inject(DataSource)
        private readonly dataSource: DataSource,
    ) {
        super();
    }

    async process(job: Job<AzaadtoolJobData>): Promise<void> {
        if (job.name !== AZAADTOOL_JOB) {
            return;
        }

        const updateProcessStatusForJob = bindUpdateProcessStatus({
            dataSource: this.dataSource,
        });

        await runWithProcessStatus({
            job: job,
            task: this.runAzaadtool.bind(this),
            updateProcessStatus: updateProcessStatusForJob,
            runningStatus: PROCESS_STATUS.RUNNING,
            successStatus: PROCESS_STATUS.SUCCESS,
            failedStatus: PROCESS_STATUS.FAILED,
        });
    }

    private async runAzaadtool(
        job: Job<AzaadtoolJobData>,
    ): Promise<Record<string, unknown>> {
        const { file_id: fileId } = job.data;

        const file = await getFileById({
            fileId: fileId,
            dataSource: this.dataSource,
        });
        const fileMeta = await getFileMetaByFileId({
            fileId: fileId,
            dataSource: this.dataSource,
        });
        const storagePath = readString(fileMeta, 'storage_path');
        const bucketName = readString(fileMeta, 'bucket_name');
        const fileBuffer = await downloadFileBuffer({
            storagePath: storagePath,
            bucketName: bucketName,
        });
        const fileContent = fileBuffer.toString('utf-8');

        // generated tool_details chain
        let result = multiply({ a: 1, b: 1 });

        await bulk_insert_entity_records({
            dataSource: this.dataSource,
            entityName: 'student',
            data: result,
        });

        return {
            file_id: fileId,
            file_name: readString(file, 'file_name'),
            ingested_record_count: Array.isArray(result) ? result.length : 1,
        };
    }
}

export { AZAADTOOL_QUEUE, AZAADTOOL_JOB };
