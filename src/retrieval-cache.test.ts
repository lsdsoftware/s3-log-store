import { describe, expect } from "@service-broker/test-utils";
import fsp from "fs/promises";
import os from "os";
import path from "path";
import * as rxjs from "rxjs";
import { makeRetrievalCache } from "./retrieval-cache.js";


describe('retrieval-cache', ({ beforeEach, afterEach, test }) => {
  let cacheFolder: string
  let cache: ReturnType<typeof makeRetrievalCache>
  let jobKill$: rxjs.Subject<void>
  let job$: rxjs.Observable<unknown>

  beforeEach(async () => {
    cacheFolder = path.join(os.tmpdir(), 's3logstore-testretrievalcache-' + Math.random().toString(36).slice(2))
    await fsp.mkdir(cacheFolder)
    cache = makeRetrievalCache({
      cacheFolder,
      cleanupInterval: 100,
      makeAccessTracker() {
        const tti = 150
        let lastAccess = Date.now()
        return {
          notifyAccess: () => lastAccess = Date.now(),
          isPurgeable: () => lastAccess + tti <= Date.now()
        }
      },
    })
    jobKill$ = new rxjs.Subject()
    job$ = cache.cleanupJob$.pipe(
      rxjs.takeUntil(jobKill$),
      rxjs.share({ resetOnRefCountZero: false })
    )
  })

  afterEach(async () => {
    jobKill$.next()
    await fsp.rm(cacheFolder, { recursive: true })
  })

  test('main', async () => {
    //cleanup at startup
    expect(await rxjs.firstValueFrom(job$), { filesDeleted: [] })

    expect(await cache.get('1'), undefined)
    await cache.set('1', 'uno')
    await cache.set('2', 'dos')
    expect(await cache.get('1'), 'uno')

    //first cleanup at 100ms
    expect(await rxjs.firstValueFrom(job$), { filesDeleted: [] })
    expect(await cache.get('1'), 'uno')

    //second cleanup at 200ms
    expect(await rxjs.firstValueFrom(job$), { filesDeleted: ['2'] })
    expect(await cache.get('2'), undefined)

    //third cleanup at 300ms
    expect(await rxjs.firstValueFrom(job$), { filesDeleted: ['1'] })
    expect(await cache.get('1'), undefined)
  })
})
