import * as s3 from "@aws-sdk/client-s3";
import * as rxjs from "rxjs";
import { AccessTracker } from "./retrieval-cache.js";
export declare function makeLogStore<T>({ workDirConfig, s3StoreConfig, retrievalCacheConfig, }: {
    workDirConfig: {
        dirPath: string;
        syncInterval: number;
        chunkSize: number;
        inactiveTtlDays: number;
    };
    s3StoreConfig: {
        clientConfig: s3.S3ClientConfig;
        bucket: string;
        folder: string;
    };
    retrievalCacheConfig: {
        cacheFolder: string;
        cleanupInterval: number;
        makeAccessTracker(): AccessTracker;
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
    subscribe(fileName: string): rxjs.Observable<T>;
};
