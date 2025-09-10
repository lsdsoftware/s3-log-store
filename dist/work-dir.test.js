import { describe, expect } from "@service-broker/test-utils";
import fsp from "fs/promises";
import os from "os";
import path from "path";
import { makeWorkDir } from "./work-dir.js";
describe('work-dir', ({ beforeEach, afterEach, test }) => {
    let workDirPath;
    let workDir;
    beforeEach(async () => {
        workDirPath = path.join(os.tmpdir(), "s3logstore-testworkdir-" + Math.random().toString(36).slice(2));
        await fsp.mkdir(workDirPath);
        workDir = makeWorkDir(workDirPath);
    });
    afterEach(async () => {
        await fsp.rm(workDirPath, { recursive: true });
    });
    test('ensureEmpty', async () => {
        await workDir.ensureEmpty();
        await fsp.writeFile(path.join(workDirPath, 'dummy'), 'dummy');
        await workDir.ensureEmpty()
            .then(() => { throw new Error('!throwAsExpected'); }, err => expect(err.message, 'Workdir not empty as expected'));
    });
    test('listChanges', async () => {
        await fsp.writeFile(path.join(workDirPath, 'before'), 'before');
        await new Promise(f => setTimeout(f, 100));
        await fsp.writeFile(path.join(workDirPath, 'checkpoint'), 'checkpoint');
        await new Promise(f => setTimeout(f, 100));
        await fsp.writeFile(path.join(workDirPath, 'after'), 'after');
        expect(await workDir.listChanges(path.join(workDirPath, 'checkpoint')), ['after']);
    });
    test('deleteInactive', async () => {
        const now = Date.now();
        const twentyFourHoursAgo = now - 24 * 3600_000;
        const inactivePath = path.join(workDirPath, 'inactive');
        await fsp.writeFile(inactivePath, 'inactive');
        await fsp.utimes(inactivePath, new Date(now), new Date(twentyFourHoursAgo - 10_000));
        const activePath = path.join(workDirPath, 'active');
        await fsp.writeFile(activePath, 'active');
        await fsp.utimes(activePath, new Date(now), new Date(twentyFourHoursAgo + 10_000));
        await workDir.deleteInactive(1);
        expect(await fsp.readdir(workDirPath), ['active']);
    });
    test('makeWorkFile', async () => {
        const workFile = workDir.makeWorkFile('first');
        await workFile.append('line1\nline2\n');
        expect(await workFile.read(), { payload: 'line1\nline2\n' });
        await workFile.write(11, 'line3\nline4\n');
        await workFile.append('line5\n');
        expect(await workFile.read(), { header: { seqNum: 11 }, payload: 'line3\nline4\nline5\n' });
    });
});
//# sourceMappingURL=work-dir.test.js.map