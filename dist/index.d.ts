import * as rxjs from "rxjs";
export declare function makeLogStore<T>({ workDirPath, syncInterval, s3Config, chunkSize, inactiveTtlDays, retrievalCacheConfig, }: {
    workDirPath: string;
    syncInterval: number;
    s3Config: {
        profile: string;
        region: string;
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
