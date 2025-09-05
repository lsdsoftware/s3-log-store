export function makeDeleteInactiveTask({ workDir, inactiveTtlDays }) {
    return {
        async run() {
            const fileNames = await workDir.deleteInactive(inactiveTtlDays);
            return { filesDeleted: fileNames };
        }
    };
}
//# sourceMappingURL=delete-inactive-task.js.map