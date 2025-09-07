import * as s3 from "@aws-sdk/client-s3";
import { describe, expect } from "@service-broker/test-utils";
import assert from "assert";
import { makeS3Store } from "./s3-store.js";
describe('s3-store', ({ beforeAll, afterAll, beforeEach, test }) => {
    assert(process.env.S3_PROFILE &&
        process.env.S3_REGION &&
        process.env.S3_BUCKET &&
        process.env.S3_FOLDER);
    const client = new s3.S3Client({
        profile: process.env.S3_PROFILE,
        region: process.env.S3_REGION
    });
    const store = makeS3Store({
        client,
        bucket: process.env.S3_BUCKET,
        folder: process.env.S3_FOLDER
    });
    function listObjects() {
        return client.send(new s3.ListObjectsV2Command({
            Bucket: store.bucket,
            Prefix: store.folder + '/'
        }));
    }
    beforeAll(async () => {
        assert.equal((await listObjects()).Contents, undefined);
    });
    afterAll(async () => {
        const { Contents } = await listObjects();
        if (Contents?.length) {
            await client.send(new s3.DeleteObjectsCommand({
                Bucket: store.bucket,
                Delete: {
                    Objects: Contents.map(({ Key }) => ({ Key }))
                }
            }));
        }
    });
    let fileName;
    beforeEach(async () => {
        fileName = Math.random().toString(36).slice(2);
    });
    test('main', async () => {
        expect(await store.getMaxSeqNum(fileName), 0);
        await store.getFile(fileName, 1)
            .then(() => { throw new Error('!throwAsExpected'); }, err => expect(err.Code, 'NoSuchKey'));
        await store.putFile(fileName, 1, Buffer.from('uno'));
        await store.putFile(fileName, 2, Buffer.from('dos'));
        expect(await store.getMaxSeqNum(fileName), 2);
        expect(await store.getFile(fileName, 1), Buffer.from('uno'));
        expect(await store.getFile(fileName, 2), Buffer.from('dos'));
        await store.getFile(fileName, 3)
            .then(() => { throw new Error('!throwAsExpected'); }, err => expect(err.Code, 'NoSuchKey'));
    });
});
//# sourceMappingURL=s3-store.test.js.map