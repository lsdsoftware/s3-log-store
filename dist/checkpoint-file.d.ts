export declare function makeCheckpointFile(filePath: string): {
    filePath: string;
    mtime(): Promise<Date | undefined>;
    touch(): Promise<void>;
};
