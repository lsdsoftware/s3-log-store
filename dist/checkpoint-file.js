import fsp from "fs/promises";
export function makeCheckpointFile(filePath) {
    return {
        filePath,
        async create() {
            await fsp.writeFile(filePath, 'checkpoint');
            await this.touch();
        },
        async mtime() {
            try {
                const { mtime } = await fsp.stat(filePath);
                return mtime;
            }
            catch (err) {
                if (err.code == 'ENOENT')
                    return undefined;
                else
                    throw err;
            }
        },
        async touch() {
            const now = new Date();
            await fsp.utimes(filePath, now, now);
        }
    };
}
//# sourceMappingURL=checkpoint-file.js.map