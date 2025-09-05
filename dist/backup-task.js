import { promisify } from "util";
import { gzip } from "zlib";
export function makeBackupTask({ workDir, checkpointFile, s3Store, chunkSize }) {
    return {
        async run() {
            const checkpointTime = await checkpointFile.mtime();
            if (checkpointTime) {
                const fileNames = await workDir.listChanges(checkpointFile.filePath);
                await checkpointFile.touch();
                const filesBackedUp = [];
                for (const fileName of fileNames) {
                    filesBackedUp.push(await backup(fileName));
                }
                return { lastCheckpoint: checkpointTime, filesBackedUp };
            }
            else {
                await workDir.ensureEmpty();
                await checkpointFile.touch();
                return { lastCheckpoint: undefined };
            }
        }
    };
    async function backup(fileName) {
        const workFile = workDir.makeWorkFile(fileName);
        const { header, payload } = await workFile.read();
        if (payload.length) {
            const payloadGzipped = await promisify(gzip)(payload);
            if (header) {
                await s3Store.putFile(fileName, header.seqNum, payloadGzipped);
                if (payloadGzipped.length >= chunkSize) {
                    await workFile.write(header.seqNum + 1);
                }
                return { fileName, hasHeader: true, seqNum: header.seqNum, size: payload.length, gzipSize: payloadGzipped.length };
            }
            else {
                const seqNum = (await s3Store.getMaxSeqNum(fileName)) + 1;
                await s3Store.putFile(fileName, seqNum, payloadGzipped);
                if (payloadGzipped.length >= chunkSize) {
                    await workFile.write(seqNum + 1);
                }
                else {
                    //rewrite file with header info
                    await workFile.write(seqNum, payload);
                }
                return { fileName, hasHeader: false, seqNum, size: payload.length, gzipSize: payloadGzipped.length };
            }
        }
        else {
            return { fileName, hasHeader: header != undefined, seqNum: header?.seqNum, size: 0, gzipSize: 0 };
        }
    }
}
//# sourceMappingURL=backup-task.js.map