import fs from "fs";
import fsp from "fs/promises";
import path from "path";
import * as rxjs from "rxjs";
export function makeRetrievalCache({ cacheFolder, cleanupInterval, makeAccessTracker }) {
    fs.statSync(cacheFolder);
    const accessTrackers = new Map();
    return {
        cleanupJob$: rxjs.timer(0, cleanupInterval).pipe(rxjs.exhaustMap(cleanup)),
        async get(hashKey) {
            try {
                const value = await fsp.readFile(path.join(cacheFolder, hashKey), 'utf8');
                accessTrackers.get(hashKey)?.notifyAccess();
                return value;
            }
            catch (err) {
                if (err.code != 'ENOENT')
                    throw err;
            }
        },
        async set(hashKey, value) {
            await fsp.writeFile(path.join(cacheFolder, hashKey), value);
            accessTrackers.set(hashKey, makeAccessTracker());
        }
    };
    async function cleanup() {
        const filesDeleted = [];
        for (const hashKey of await fsp.readdir(cacheFolder)) {
            const tracker = accessTrackers.get(hashKey);
            if (tracker) {
                if (tracker.isPurgeable()) {
                    await fsp.rm(path.join(cacheFolder, hashKey));
                    accessTrackers.delete(hashKey);
                    filesDeleted.push(hashKey);
                }
            }
            else {
                //if entry isn't currently tracked, e.g. process restart, start tracking
                accessTrackers.set(hashKey, makeAccessTracker());
            }
        }
        return { filesDeleted };
    }
}
//# sourceMappingURL=retrieval-cache.js.map