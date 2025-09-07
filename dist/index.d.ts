import * as s3 from "@aws-sdk/client-s3";
import * as rxjs from "rxjs";
export declare function makeLogStore<T>({ workDirPath, syncInterval, s3StoreConfig, chunkSize, inactiveTtlDays, retrievalCacheConfig, }: {
    workDirPath: string;
    syncInterval: number;
    s3StoreConfig: {
        client: s3.S3Client;
        bucket: string;
        folder: string;
    };
    chunkSize: number;
    inactiveTtlDays: number;
    retrievalCacheConfig: {
        cacheFolder: string;
        tti: number;
        cleanupInterval: number;
    };
}): {
    syncJob$: rxjs.Observable<{
        deleteInactiveStatus: {
            filesDeleted: string[];
        };
        backupStatus: {
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
        };
    }>;
    retrievalCacheCleanupJob$: rxjs.Observable<{
        filesDeleted: string[];
    }>;
    append(fileName: string, entry: T): Promise<void>;
    retrieve(fileName: string, offset: number, limit: number): Promise<T[]>;
};
