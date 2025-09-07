import { describe, expect } from "@service-broker/test-utils";
import fs from "fs";
import os from "os";
import path from "path";
import * as rxjs from "rxjs";
import { makeRetrievalCache } from "./retrieval-cache.js";


describe('retrieval-cache', ({ beforeEach, afterEach, test }) => {
  const cacheFolder = path.join(os.tmpdir(), 's3logstore-testretrievalcache-' + Math.random().toString(36).slice(2))
  let cache: ReturnType<typeof makeRetrievalCache>
  let job$: rxjs.Observable<unknown>
  let jobSub: rxjs.Subscription

  beforeEach(() => {
    fs.mkdirSync(cacheFolder)
    cache = makeRetrievalCache({ cacheFolder, tti: 150, cleanupInterval: 100 })
    job$ = cache.cleanupJob$.pipe(rxjs.share())
    jobSub = job$.subscribe()
  })

  afterEach(() => {
    jobSub.unsubscribe()
    fs.rmSync(cacheFolder, { recursive: true })
  })

  test('main', async () => {
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
