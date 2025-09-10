import * as s3 from "@aws-sdk/client-s3";
export declare function makeS3Store({ client, bucket, folder }: {
    client: s3.S3Client;
    bucket: string;
    folder: string;
}): {
    getMaxSeqNum(fileName: string): Promise<number>;
    putFile(fileName: string, seqNum: number, payload: Buffer): Promise<void>;
    getFile(fileName: string, seqNum: number): Promise<Buffer<ArrayBufferLike>>;
};
