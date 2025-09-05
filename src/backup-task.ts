import { promisify } from "util"
import { gzip } from "zlib"
import { makeCheckpointFile } from "./checkpoint-file.js"
import { makeS3Store } from "./s3-store.js"
import { makeWorkDir } from "./work-dir.js"

export function makeBackupTask({ workDir, checkpointFile, s3Store, chunkSize }: {
  workDir: ReturnType<typeof makeWorkDir>
  checkpointFile: ReturnType<typeof makeCheckpointFile>
  s3Store: ReturnType<typeof makeS3Store>
  chunkSize: number
}) {
  return {
    async run() {
      const checkpointTime = await checkpointFile.getTime()
      if (checkpointTime != null) {
        const fileNames = await workDir.listChanges(checkpointFile.filePath)
        await checkpointFile.touch()
        const filesBackedUp = []
        for (const fileName of fileNames) {
          filesBackedUp.push(await backup(fileName))
        }
        return { lastCheckpoint: checkpointTime, filesBackedUp }
      } else {
        await workDir.ensureEmpty()
        await checkpointFile.touch()
        return { lastCheckpoint: undefined }
      }
    }
  }

  async function backup(fileName: string) {
    const workFile = workDir.makeWorkFile(fileName)
    const { header, payload } = await workFile.read()
    if (payload.length) {
      const payloadGzipped = await promisify(gzip)(payload)
      if (header) {
        await s3Store.putFile(fileName, header.seqNum, payloadGzipped)
        if (payloadGzipped.length >= chunkSize) {
          await workFile.write(header.seqNum + 1)
        }
        return { fileName, hasHeader: true, seqNum: header.seqNum, size: payload.length, gzipSize: payloadGzipped.length }
      } else {
        const seqNum = (await s3Store.getMaxSeqNum(fileName)) + 1
        await s3Store.putFile(fileName, seqNum, payloadGzipped)
        if (payloadGzipped.length >= chunkSize) {
          await workFile.write(seqNum + 1)
        } else {
          //rewrite file with header info
          await workFile.write(seqNum, payload)
        }
        return { fileName, hasHeader: false, seqNum, size: payload.length, gzipSize: payloadGzipped.length }
      }
    } else {
      return { fileName, hasHeader: header != null, seqNum: header?.seqNum, size: 0, gzipSize: 0 }
    }
  }
}
