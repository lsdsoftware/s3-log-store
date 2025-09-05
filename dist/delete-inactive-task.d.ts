import { makeWorkDir } from "./work-dir.js";
export declare function makeDeleteInactiveTask({ workDir, inactiveTtlDays }: {
    workDir: ReturnType<typeof makeWorkDir>;
    inactiveTtlDays: number;
}): {
    run(): Promise<{
        filesDeleted: string[];
    }>;
};
