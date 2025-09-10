import * as s3 from "@aws-sdk/client-s3";
import { describe, expect } from "@service-broker/test-utils";
import assert from "assert";
import { makeS3Store } from "./s3-store.js";


describe('s3-store', ({ beforeEach, afterEach, test }) => {
  assert(
    process.env.S3_PROFILE &&
    process.env.S3_REGION &&
    process.env.S3_BUCKET
  )
  const client = new s3.S3Client({
    profile: process.env.S3_PROFILE,
    region: process.env.S3_REGION
  })
  const bucket = process.env.S3_BUCKET

  let folder: string
  let store: ReturnType<typeof makeS3Store>

  beforeEach(async () => {
    folder = 's3logstore-test-' + Math.random().toString(36).slice(2)
    store = makeS3Store({ client, bucket, folder})
  })

  afterEach(async () => {
    const { Contents } = await client.send(new s3.ListObjectsV2Command({
      Bucket: bucket,
      Prefix: folder + '/'
    }))
    if (Contents?.length) {
      await client.send(new s3.DeleteObjectsCommand({
        Bucket: bucket,
        Delete: { Objects: Contents.map(({ Key }) => ({ Key })) }
      }))
    }
  })

  test('main', async () => {
    expect(await store.getMaxSeqNum('aa'), 0)
    await store.getFile('aa', 1)
      .then(
        () => { throw new Error('!throwAsExpected') },
        err => expect(err.Code, 'NoSuchKey')
      )
    await store.putFile('aa', 1, Buffer.from('uno'))
    await store.putFile('aa', 2, Buffer.from('dos'))
    expect(await store.getMaxSeqNum('aa'), 2)
    expect(await store.getFile('aa', 1), Buffer.from('uno'))
    expect(await store.getFile('aa', 2), Buffer.from('dos'))
    await store.getFile('aa', 3)
      .then(
        () => { throw new Error('!throwAsExpected') },
        err => expect(err.Code, 'NoSuchKey')
      )
  })
})
