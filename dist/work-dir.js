import cp from "child_process";
import fs from "fs";
import fsp from "fs/promises";
import path from "path";
import util from "util";
export function makeWorkDir(dirPath) {
    fs.statSync(dirPath);
    return {
        async ensureEmpty() {
            const files = await fsp.readdir(dirPath);
            if (files.length)
                throw new Error("Workdir not empty as expected");
        },
        async listChanges(checkpointFilePath) {
            const { stdout } = await util.promisify(cp.execFile)('find', [
                dirPath,
                "-type", "f",
                "-newer", checkpointFilePath
            ]);
            return stdout.split('\n')
                .filter(x => x)
                .map(file => path.basename(file));
        },
        async deleteInactive(inactiveTtlDays) {
            const { stdout } = await util.promisify(cp.execFile)('find', [
                dirPath,
                "-type", "f",
                "-not", "-newermt", inactiveTtlDays + " days ago",
                "-print", "-delete"
            ]);
            return stdout.split('\n')
                .filter(x => x)
                .map(file => path.basename(file));
        },
        makeWorkFile(fileName) {
            const filePath = path.join(dirPath, fileName);
            return {
                async read() {
                    const text = await fsp.readFile(filePath, 'utf8');
                    if (text[0] == '=') {
                        const index = text.slice(0, 128).indexOf('\n');
                        if (index == -1)
                            throw new Error("Header delimiter not found");
                        return {
                            header: JSON.parse(text.slice(1, index)),
                            payload: text.slice(index + 1)
                        };
                    }
                    else {
                        return {
                            payload: text
                        };
                    }
                },
                async write(seqNum, payload = '') {
                    await fsp.writeFile(filePath, '=' + JSON.stringify({ seqNum }) + '\n' + payload);
                },
                async append(data) {
                    await fsp.appendFile(filePath, data);
                }
            };
        }
    };
}
//# sourceMappingURL=work-dir.js.map