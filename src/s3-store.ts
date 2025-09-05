import { ListObjectsV2CommandOutput, S3 } from "@aws-sdk/client-s3"

export function makeS3Store({ profile, region, bucket, folder }: {
  profile: string
  region: string
  bucket: string
  folder: string
}) {
  const s3 = new S3({ profile, region })

  return {
    url: `s3://${bucket}/${folder}`,

    async getMaxSeqNum(fileName: string): Promise<number> {
      const Prefix = folder + '/' + fileName + '/'
      let result: ListObjectsV2CommandOutput | undefined
      let maxSeqNum = 0
      do {
        result = await s3.listObjectsV2({
          Bucket: bucket,
          Prefix,
          ContinuationToken: result?.ContinuationToken
        })
        for (const { Key } of result.Contents ?? []) {
          const seqNum = Number(Key!.slice(Prefix.length))
          if (seqNum > maxSeqNum) maxSeqNum = seqNum
        }
      } while (result.ContinuationToken)
      return maxSeqNum
    },

    async putFile(fileName: string, seqNum: number, payload: Buffer) {
      await s3.putObject({
        Bucket: bucket,
        Key: folder + '/' + fileName + '/' + seqNum,
        Body: payload
      })
    },

    async getFile(fileName: string, seqNum: number) {
      const result = await s3.getObject({
        Bucket: bucket,
        Key: folder + '/' + fileName + '/' + seqNum
      })
      const byteArray = await result.Body!.transformToByteArray()
      return Buffer.from(byteArray.buffer)
    }
  }
}
