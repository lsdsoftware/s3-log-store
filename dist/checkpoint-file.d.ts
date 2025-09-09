export declare function makeCheckpointFile(filePath: string): {
    filePath: string;
    create(): Promise<void>;
    mtime(): Promise<Date | undefined>;
    touch(): Promise<void>;
};
