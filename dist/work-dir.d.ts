export declare function makeWorkDir(dirPath: string): {
    ensureEmpty(): Promise<void>;
    listChanges(checkpointFilePath: string): Promise<string[]>;
    deleteInactive(inactiveTtlDays: number): Promise<string[]>;
    makeWorkFile(fileName: string): {
        read(): Promise<{
            header: {
                seqNum: number;
            };
            payload: string;
        } | {
            payload: string;
            header?: undefined;
        }>;
        write(seqNum: number, payload?: string): Promise<void>;
        append(data: string): Promise<void>;
    };
};
