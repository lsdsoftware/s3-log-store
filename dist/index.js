import { Fetch } from "multilayer-async-cache-builder";
import path from "path";
import * as rxjs from "rxjs";
import util from "util";
import zlib from "zlib";
import { makeBackupTask } from "./backup-task.js";
import { makeCheckpointFile } from "./checkpoint-file.js";
import { makeDeleteInactiveTask } from "./delete-inactive-task.js";
import { makeRetrievalCache } from "./retrieval-cache.js";
import { makeS3Store } from "./s3-store.js";
import { makeWorkDir } from "./work-dir.js";
export function makeLogStore({ workDirConfig, s3StoreConfig, retrievalCacheConfig, }) {
    const workDir = makeWorkDir(workDirConfig.dirPath);
    const checkpointFile = makeCheckpointFile(path.join(workDirConfig.dirPath, 'checkpoint'));
    const s3Store = makeS3Store(s3StoreConfig);
    const deleteInactiveTask = makeDeleteInactiveTask({ workDir, inactiveTtlDays: workDirConfig.inactiveTtlDays });
    const backupTask = makeBackupTask({ workDir, checkpointFile, s3Store, chunkSize: workDirConfig.chunkSize });
    const retrievalCache = makeRetrievalCache(retrievalCacheConfig);
    const getChunk = new Fetch(async (key) => s3Store.getFile(key.fileName, key.seqNum)
        .then(util.promisify(zlib.gunzip))
        .then(bytes => bytes.toString()))
        .cache(retrievalCache)
        .dedupe();
    const subscriberMap = new Map();
    return {
        syncJob$: rxjs.timer(0, workDirConfig.syncInterval).pipe(rxjs.exhaustMap(async () => {
            const deleteInactiveStatus = await deleteInactiveTask.run();
            const backupStatus = await backupTask.run();
            return { deleteInactiveStatus, backupStatus };
        })),
        retrievalCacheCleanupJob$: retrievalCache.cleanupJob$,
        async append(fileName, entry) {
            const workFile = workDir.makeWorkFile(fileName);
            await workFile.append(JSON.stringify(entry) + ',\n');
            subscriberMap.get(fileName)?.forEach(x => x.next(entry));
        },
        async retrieve(fileName, offset, limit) {
            const workFile = workDir.makeWorkFile(fileName);
            const { header, payload } = await workFile.read()
                .catch(err => {
                if (err.code == 'ENOENT')
                    return { header: undefined, payload: '' };
                else
                    throw err;
            });
            let seqNum = header?.seqNum;
            let entries = parseChunk(payload);
            while (entries.length < offset + limit) {
                if (seqNum == undefined) {
                    seqNum = await s3Store.getMaxSeqNum(fileName) + 1;
                    await workFile.write(seqNum, payload);
                }
                if (seqNum <= 1)
                    break;
                seqNum--;
                const chunk = await getChunk({ fileName, seqNum, hashKey: `${fileName}-${seqNum}` });
                const earlierEntries = parseChunk(chunk);
                entries = earlierEntries.concat(entries);
            }
            return entries.slice(-offset - limit, -offset).reverse();
        },
        subscribe(fileName) {
            return new rxjs.Observable(subscriber => {
                let subscribers = subscriberMap.get(fileName);
                if (!subscribers)
                    subscriberMap.set(fileName, subscribers = new Set());
                subscribers.add(subscriber);
                return () => {
                    subscribers.delete(subscriber);
                    if (subscribers.size == 0)
                        subscriberMap.delete(fileName);
                };
            });
        }
    };
    function parseChunk(payload) {
        return JSON.parse('[' + payload.replace(/,\n$/, '') + ']');
    }
}
//# sourceMappingURL=index.js.map