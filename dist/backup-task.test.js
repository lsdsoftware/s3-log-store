import { describe, expect, valueOfType } from "@service-broker/test-utils";
import fsp from "fs/promises";
import os from "os";
import path from "path";
import { makeBackupTask } from "./backup-task.js";
import { makeCheckpointFile } from "./checkpoint-file.js";
import { makeWorkDir } from "./work-dir.js";
import zlib from "zlib";
import util from "util";
describe('backup-task', ({ beforeEach, afterEach, test }) => {
    const workDirPath = path.join(os.tmpdir(), "s3logstore-testworkdir-" + Math.random().toString(36).slice(2));
    const checkpointFilePath = path.join(os.tmpdir(), 's3logstore-testcheckpointfile-' + Math.random().toString(36).slice(2));
    let workDir;
    let checkpointFile;
    let s3Store;
    let backupTask;
    beforeEach(async () => {
        await fsp.mkdir(workDirPath);
        await fsp.rm(checkpointFilePath, { force: true });
        workDir = makeWorkDir(workDirPath);
        checkpointFile = makeCheckpointFile(checkpointFilePath);
        s3Store = mockS3Store();
        backupTask = makeBackupTask({ workDir, checkpointFile, s3Store, chunkSize: 50 });
    });
    afterEach(async () => {
        await fsp.rm(workDirPath, { recursive: true });
    });
    test('main', async () => {
        const convo1 = workDir.makeWorkFile('convo1');
        const convo2 = workDir.makeWorkFile('convo2');
        //first run, no checkpoint
        expect(await backupTask.run(), { lastCheckpoint: undefined });
        //CREATE workfiles
        await convo1.append('less than 50 gz\n');
        await convo2.append('more than 50 gzipped bytes in this message okay dude?\n');
        //second run, both convos processed
        expect(await backupTask.run(), {
            lastCheckpoint: valueOfType('object'),
            filesBackedUp: [
                { fileName: 'convo1', hasHeader: false, seqNum: 1, size: 16, gzipSize: valueOfType('number') },
                { fileName: 'convo2', hasHeader: false, seqNum: 1, size: 54, gzipSize: valueOfType('number') }
            ]
        });
        //VALIDATE:
        //convo1 below chunkSize, backed up but not incremented
        //convo2 above chunkSize, backed up and incremented
        expect(await convo1.read(), { header: { seqNum: 1 }, payload: 'less than 50 gz\n' });
        expect(await convo2.read(), { header: { seqNum: 2 }, payload: '' });
        expect(await s3Store.getFile('convo1', 1), await util.promisify(zlib.gzip)(Buffer.from('less than 50 gz\n')));
        expect(await s3Store.getFile('convo2', 1), await util.promisify(zlib.gzip)(Buffer.from('more than 50 gzipped bytes in this message okay dude?\n')));
        expect(await s3Store.getMaxSeqNum('convo1'), 1);
        expect(await s3Store.getMaxSeqNum('convo2'), 1);
        //UPDATE convo1 only
        await convo1.append('is more than 50 gzipped bytes now!\n');
        //third run, both convos processed (even though convo2 unchanged)
        expect(await backupTask.run(), {
            lastCheckpoint: valueOfType('object'),
            filesBackedUp: [
                { fileName: 'convo1', hasHeader: true, seqNum: 1, size: 51, gzipSize: valueOfType('number') },
                { fileName: 'convo2', hasHeader: true, seqNum: 2, size: 0, gzipSize: 0 }
            ]
        });
        //VALIDATE:
        //convo1 above chunkSize, backed up and incremented
        //convo2 empty, not backed up
        expect(await convo1.read(), { header: { seqNum: 2 }, payload: '' });
        expect(await convo2.read(), { header: { seqNum: 2 }, payload: '' });
        expect(await s3Store.getFile('convo1', 1), await util.promisify(zlib.gzip)(Buffer.from('less than 50 gz\nis more than 50 gzipped bytes now!\n')));
        expect(await s3Store.getFile('convo2', 1), await util.promisify(zlib.gzip)(Buffer.from('more than 50 gzipped bytes in this message okay dude?\n')));
        expect(await s3Store.getMaxSeqNum('convo1'), 1);
        expect(await s3Store.getMaxSeqNum('convo2'), 1);
        //again UPDATE convo1 only
        await convo1.append('this is short\n');
        //fourth run, only convo1 processed
        expect(await backupTask.run(), {
            lastCheckpoint: valueOfType('object'),
            filesBackedUp: [
                { fileName: 'convo1', hasHeader: true, seqNum: 2, size: 14, gzipSize: valueOfType('number') }
            ]
        });
        //VALIDATE
        //convo1 below chunkSize, backed up but not incremented
        //convo2 empty, not backed up
        expect(await convo1.read(), { header: { seqNum: 2 }, payload: 'this is short\n' });
        expect(await convo2.read(), { header: { seqNum: 2 }, payload: '' });
        expect(await s3Store.getFile('convo1', 1), await util.promisify(zlib.gzip)(Buffer.from('less than 50 gz\nis more than 50 gzipped bytes now!\n')));
        expect(await s3Store.getFile('convo1', 2), await util.promisify(zlib.gzip)(Buffer.from('this is short\n')));
        expect(await s3Store.getFile('convo2', 1), await util.promisify(zlib.gzip)(Buffer.from('more than 50 gzipped bytes in this message okay dude?\n')));
        expect(await s3Store.getMaxSeqNum('convo1'), 2);
        expect(await s3Store.getMaxSeqNum('convo2'), 1);
        //fifth run
        expect(await backupTask.run(), {
            lastCheckpoint: valueOfType('object'),
            filesBackedUp: []
        });
    });
});
function mockS3Store() {
    const map = new Map();
    return {
        bucket: 'b',
        folder: 'f',
        async getMaxSeqNum(fileName) {
            const bucket = map.get(fileName);
            let max = 0;
            if (bucket)
                for (const seqNum of bucket.keys())
                    if (seqNum > max)
                        max = seqNum;
            return max;
        },
        async putFile(fileName, seqNum, payload) {
            let bucket = map.get(fileName);
            if (!bucket)
                map.set(fileName, bucket = new Map());
            bucket.set(seqNum, payload);
        },
        async getFile(fileName, seqNum) {
            const bucket = map.get(fileName);
            const payload = bucket?.get(seqNum);
            return payload ?? Promise.reject({
                Code: 'NoSuchKey',
                message: `Missing ${fileName}/${seqNum}`
            });
        },
    };
}
//# sourceMappingURL=backup-task.test.js.map