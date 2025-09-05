import { makeCheckpointFile } from "./checkpoint-file.js";
import { makeS3Store } from "./s3-store.js";
import { makeWorkDir } from "./work-dir.js";
export declare function makeBackupTask({ workDir, checkpointFile, s3Store, chunkSize }: {
    workDir: ReturnType<typeof makeWorkDir>;
    checkpointFile: ReturnType<typeof makeCheckpointFile>;
    s3Store: ReturnType<typeof makeS3Store>;
    chunkSize: number;
}): {
    run(): Promise<{
        lastCheckpoint: Date;
        filesBackedUp: {
            fileName: string;
            hasHeader: boolean;
            seqNum: number | undefined;
            size: number;
            gzipSize: number;
        }[];
    } | {
        lastCheckpoint: undefined;
        filesBackedUp?: undefined;
    }>;
};
