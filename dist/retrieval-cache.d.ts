import * as rxjs from "rxjs";
export interface AccessTracker {
    notifyAccess(): void;
    isPurgeable(): boolean;
}
export declare function makeRetrievalCache({ cacheFolder, cleanupInterval, makeAccessTracker }: {
    cacheFolder: string;
    cleanupInterval: number;
    makeAccessTracker(): AccessTracker;
}): {
    cleanupJob$: rxjs.Observable<{
        filesDeleted: string[];
    }>;
    get(hashKey: string): Promise<string | undefined>;
    set(hashKey: string, value: string): Promise<void>;
};
