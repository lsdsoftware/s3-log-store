import * as rxjs from "rxjs";
export declare function makeRetrievalCache({ cacheFolder, tti, cleanupInterval }: {
    cacheFolder: string;
    tti: number;
    cleanupInterval: number;
}): {
    cleanupJob$: rxjs.Observable<{
        filesDeleted: string[];
    }>;
    get(hashKey: string): Promise<string | undefined>;
    set(hashKey: string, value: string): Promise<void>;
};
