export declare function makeCheckpointFile(filePath: string): {
    filePath: string;
    getTime(): Promise<Date | null>;
    touch(): Promise<void>;
};
