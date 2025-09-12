import * as s3 from "@aws-sdk/client-s3";
import { describe, expect } from "@service-broker/test-utils";
import assert from "assert";
import fsp from "fs/promises";
import os from "os";
import path from "path";
import util from "util";
import zlib from "zlib";
import { makeLogStore } from "./index.js";
describe('index', ({ beforeEach, afterEach, test }) => {
    assert(process.env.S3_PROFILE &&
        process.env.S3_REGION &&
        process.env.S3_BUCKET);
    const s3StoreConfig = {
        profile: process.env.S3_PROFILE,
        region: process.env.S3_REGION,
        bucket: process.env.S3_BUCKET
    };
    const s3Client = new s3.S3Client(s3StoreConfig);
    let workDirPath;
    let retrievalCacheFolder;
    let s3StoreFolder;
    let logStore;
    beforeEach(async () => {
        const randStr = Math.random().toString(36).slice(2);
        workDirPath = path.join(os.tmpdir(), "s3logstore-testworkdir-" + randStr);
        retrievalCacheFolder = path.join(os.tmpdir(), 's3logstore-testretrievalcache-' + randStr);
        await fsp.mkdir(workDirPath);
        await fsp.mkdir(retrievalCacheFolder);
        s3StoreFolder = 's3logstore-test-' + randStr;
        logStore = makeLogStore({
            workDirConfig: {
                dirPath: workDirPath,
                syncInterval: 3600_1000,
                chunkSize: 150_000,
                inactiveTtlDays: 7
            },
            s3StoreConfig: {
                clientConfig: s3StoreConfig,
                bucket: s3StoreConfig.bucket,
                folder: s3StoreFolder
            },
            retrievalCacheConfig: {
                cacheFolder: retrievalCacheFolder,
                cleanupInterval: 3600_000,
                makeAccessTracker() {
                    const tti = 36 * 3600_000;
                    let lastAccess = Date.now();
                    return {
                        notifyAccess: () => lastAccess = Date.now(),
                        isPurgeable: () => lastAccess + tti <= Date.now()
                    };
                }
            }
        });
    });
    afterEach(async () => {
        await fsp.rm(workDirPath, { recursive: true });
        await fsp.rm(retrievalCacheFolder, { recursive: true });
        const { Contents } = await s3Client.send(new s3.ListObjectsV2Command({
            Bucket: s3StoreConfig.bucket,
            Prefix: s3StoreFolder + '/'
        }));
        if (Contents?.length) {
            await s3Client.send(new s3.DeleteObjectsCommand({
                Bucket: s3StoreConfig.bucket,
                Delete: { Objects: Contents.map(({ Key }) => ({ Key })) }
            }));
        }
    });
    test('main', async () => {
        await logStore.append('aa', 'tres');
        await logStore.append('aa', 'quatro');
        await s3Client.send(new s3.PutObjectCommand({
            Bucket: s3StoreConfig.bucket,
            Key: s3StoreFolder + '/' + 'aa/1',
            Body: await util.promisify(zlib.gzip)(JSON.stringify('uno') + ',\n' +
                JSON.stringify('dos') + ',\n')
        }));
        expect(await logStore.retrieve('aa', 1, 2), ['tres', 'dos']);
        expect(await logStore.retrieve('aa', 1, 10), ['tres', 'dos', 'uno']);
    });
});
//# sourceMappingURL=index.test.js.map