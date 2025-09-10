import { describe, expect } from "@service-broker/test-utils";
import assert from "assert";
import fsp from "fs/promises";
import os from "os";
import path from "path";
import { makeCheckpointFile } from "./checkpoint-file.js";


describe('checkpoint-file', ({ beforeEach, afterEach, test }) => {
  let filePath: string
  let file: ReturnType<typeof makeCheckpointFile>

  beforeEach(async () => {
    filePath = path.join(os.tmpdir(), 's3logstore-testcheckpointfile-' + Math.random().toString(36).slice(2))
    file = makeCheckpointFile(filePath)
  })

  afterEach(async () => {
    await fsp.rm(filePath, { force: true })
  })

  test('main', async () => {
    expect(await file.mtime(), undefined)

    const t1 = new Date()
    await file.create()   //f1
    const t2 = new Date()
    const f1 = await file.mtime()
    assert(f1 && f1 >= t1 && t2 >= f1)

    const t3 = new Date()
    await file.touch()    //f2
    const t4 = new Date()
    const f2 = await file.mtime()
    assert(f2 && f2 >= t3 && t4 >= f2)
  })
})
