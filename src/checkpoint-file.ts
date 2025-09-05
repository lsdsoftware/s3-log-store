import cp from "child_process"
import fsp from "fs/promises"
import util from "util"

export function makeCheckpointFile(filePath: string) {
  return {
    filePath,

    async getTime() {
      try {
        const { mtime } = await fsp.stat(filePath)
        return mtime
      } catch (err: any) {
        if (err.code == 'ENOENT') return null
        else throw err
      }
    },

    async touch() {
      await util.promisify(cp.execFile)('touch', [filePath])
    }
  }
}
