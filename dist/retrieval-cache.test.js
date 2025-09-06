import { describe, expect } from "@service-broker/test-utils";
import fs from "fs";
import os from "os";
import path from "path";
import { makeRetrievalCache } from "./retrieval-cache.js";
import * as rxjs from "rxjs";
const cacheFolder = path.join(os.tmpdir(), 's3logstore-testretrievalcache');
describe('retrieval-cache', ({ beforeEach, afterEach, test }) => {
    let cache;
    let job$;
    let jobSub;
    beforeEach(() => {
        fs.mkdirSync(cacheFolder);
        cache = makeRetrievalCache({ cacheFolder, tti: 150, cleanupInterval: 100 });
        job$ = cache.cleanupJob$.pipe(rxjs.share());
        jobSub = job$.subscribe();
    });
    afterEach(() => {
        jobSub.unsubscribe();
        fs.rmSync(cacheFolder, { recursive: true });
    });
    test('main', async () => {
        expect(await cache.get('1'), undefined);
        await cache.set('1', 'uno');
        await cache.set('2', 'dos');
        expect(await cache.get('1'), 'uno');
        //first cleanup at 100ms
        expect(await rxjs.firstValueFrom(job$), { filesDeleted: [] });
        expect(await cache.get('1'), 'uno');
        //second cleanup at 200ms
        expect(await rxjs.firstValueFrom(job$), { filesDeleted: ['2'] });
        expect(await cache.get('2'), undefined);
        //third cleanup at 300ms
        expect(await rxjs.firstValueFrom(job$), { filesDeleted: ['1'] });
        expect(await cache.get('1'), undefined);
    });
});
//# sourceMappingURL=retrieval-cache.test.js.map