import * as s3 from "@aws-sdk/client-s3";
export function makeS3Store({ clientConfig, bucket, folder }) {
    const client = new s3.S3Client(clientConfig);
    return {
        async getMaxSeqNum(fileName) {
            const Prefix = folder + '/' + fileName + '/';
            let result;
            let maxSeqNum = 0;
            do {
                result = await client.send(new s3.ListObjectsV2Command({
                    Bucket: bucket,
                    Prefix,
                    ContinuationToken: result?.ContinuationToken
                }));
                for (const { Key } of result.Contents ?? []) {
                    const seqNum = Number(Key.slice(Prefix.length));
                    if (seqNum > maxSeqNum)
                        maxSeqNum = seqNum;
                }
            } while (result.ContinuationToken);
            return maxSeqNum;
        },
        async putFile(fileName, seqNum, payload) {
            await client.send(new s3.PutObjectCommand({
                Bucket: bucket,
                Key: folder + '/' + fileName + '/' + seqNum,
                Body: payload
            }));
        },
        async getFile(fileName, seqNum) {
            const result = await client.send(new s3.GetObjectCommand({
                Bucket: bucket,
                Key: folder + '/' + fileName + '/' + seqNum
            }));
            const byteArray = await result.Body.transformToByteArray();
            return Buffer.from(byteArray.buffer);
        }
    };
}
//# sourceMappingURL=s3-store.js.map