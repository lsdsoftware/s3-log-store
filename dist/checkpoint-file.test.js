import { describe, expect, Expectation } from "@service-broker/test-utils";
import assert from "assert";
import fsp from "fs/promises";
import os from "os";
import path from "path";
import { makeCheckpointFile } from "./checkpoint-file.js";
describe('checkpoint-file', ({ beforeEach, test }) => {
    const filePath = path.join(os.tmpdir(), 's3logstore-testcheckpointfile-' + Math.random().toString(36).slice(2));
    const file = makeCheckpointFile(filePath);
    beforeEach(async () => {
        await fsp.rm(filePath, { force: true });
    });
    test('main', async () => {
        expect(await file.mtime(), undefined);
        const start = new Date();
        await file.touch();
        const first = await file.mtime();
        await file.touch();
        const second = await file.mtime();
        assert(first && second);
        expect(first, rightAfter(start));
        expect(second, rightAfter(first));
    });
});
function rightAfter(expected) {
    return new Expectation('rightAfter', expected, actual => {
        assert(actual instanceof Date);
        assert(actual > expected && actual.getTime() - expected.getTime() < 100);
    });
}
//# sourceMappingURL=checkpoint-file.test.js.map