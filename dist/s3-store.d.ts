export declare function makeS3Store({ profile, region, bucket, folder }: {
    profile: string;
    region: string;
    bucket: string;
    folder: string;
}): {
    url: string;
    getMaxSeqNum(fileName: string): Promise<number>;
    putFile(fileName: string, seqNum: number, payload: Buffer): Promise<void>;
    getFile(fileName: string, seqNum: number): Promise<Buffer<ArrayBufferLike>>;
};
