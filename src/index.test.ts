import * as s3 from "@aws-sdk/client-s3";
import { describe, expect } from "@service-broker/test-utils";
import assert from "assert";
import fsp from "fs/promises";
import os from "os";
import path from "path";
import { makeLogStore } from "./index.js";
import zlib from "zlib"
import util from "util"


describe('index', ({ beforeAll, afterAll, beforeEach, afterEach, test }) => {
  const workDirPath = path.join(os.tmpdir(), "s3logstore-testworkdir-" + Math.random().toString(36).slice(2))
  const retrievalCacheFolder = path.join(os.tmpdir(), 's3logstore-testretrievalcache-' + Math.random().toString(36).slice(2))

  assert(
    process.env.S3_PROFILE &&
    process.env.S3_REGION &&
    process.env.S3_BUCKET &&
    process.env.S3_FOLDER
  )
  const s3StoreConfig = {
    profile: process.env.S3_PROFILE,
    region: process.env.S3_REGION,
    bucket: process.env.S3_BUCKET,
    folder: process.env.S3_FOLDER
  }
  const client = new s3.S3Client(s3StoreConfig)
  function listObjects() {
    return client.send(new s3.ListObjectsV2Command({
      Bucket: s3StoreConfig.bucket,
      Prefix: s3StoreConfig.folder + '/'
    }))
  }

  let logStore: ReturnType<typeof makeLogStore>
  let fileName: string

  beforeAll(async () => {
    assert.equal((await listObjects()).Contents, undefined)
  })

  afterAll(async () => {
    const { Contents } = await listObjects()
    if (Contents?.length) {
      await client.send(new s3.DeleteObjectsCommand({
        Bucket: s3StoreConfig.bucket,
        Delete: {
          Objects: Contents.map(({ Key }) => ({ Key }))
        }
      }))
    }
  })

  beforeEach(async () => {
    await fsp.mkdir(workDirPath)
    await fsp.mkdir(retrievalCacheFolder)
    logStore = makeLogStore({
      workDirPath,
      syncInterval: 3600_1000,
      chunkSize: 150_000,
      inactiveTtlDays: 7,
      s3StoreConfig: {
        client,
        bucket: s3StoreConfig.bucket,
        folder: s3StoreConfig.folder
      },
      retrievalCacheConfig: {
        cacheFolder: retrievalCacheFolder,
        tti: 36*3600_000,
        cleanupInterval: 3600_000
      }
    })
    fileName = Math.random().toString(36).slice(2)
  })

  afterEach(async () => {
    await fsp.rm(workDirPath, { recursive: true })
    await fsp.rm(retrievalCacheFolder, { recursive: true })
  })

  test('main', async () => {
    await logStore.append(fileName, 'tres')
    await logStore.append(fileName, 'quatro')
    await client.send(new s3.PutObjectCommand({
      Bucket: s3StoreConfig.bucket,
      Key: s3StoreConfig.folder + '/' + fileName + '/1',
      Body: await util.promisify(zlib.gzip)(JSON.stringify('uno') + ',\n' + JSON.stringify('dos') + ',\n')
    }))
    expect(await logStore.retrieve(fileName, 1, 2), ['tres', 'dos'])
    expect(await logStore.retrieve(fileName, 1, 10), ['tres', 'dos', 'uno'])
  })
})
