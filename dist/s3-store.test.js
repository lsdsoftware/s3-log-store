import assert from "assert";
import { makeS3Store } from "./s3-store.js";
import { afterEverything, describe, expect } from "@service-broker/test-utils";
import { S3 } from "@aws-sdk/client-s3";
assert(process.env.S3_PROFILE &&
    process.env.S3_REGION &&
    process.env.S3_BUCKET &&
    process.env.S3_FOLDER);
const config = {
    profile: process.env.S3_PROFILE,
    region: process.env.S3_REGION,
    bucket: process.env.S3_BUCKET,
    folder: process.env.S3_FOLDER
};
const s3 = new S3(config);
const store = makeS3Store(config);
function listObjects() {
    return s3.listObjectsV2({
        Bucket: config.bucket,
        Prefix: config.folder + '/'
    });
}
//startup
assert.equal((await listObjects()).Contents, undefined);
//shutdown
afterEverything(async () => {
    const { Contents } = await listObjects();
    if (Contents?.length) {
        await s3.deleteObjects({
            Bucket: config.bucket,
            Delete: {
                Objects: Contents.map(({ Key }) => ({ Key }))
            }
        });
    }
});
describe('s3-store', ({ beforeEach, test }) => {
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