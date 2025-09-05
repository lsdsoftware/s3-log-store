import fs from "fs"
import fsp from "fs/promises"
import path from "path"
import * as rxjs from "rxjs"

export function makeRetrievalCache({ cacheFolder, tti, cleanupInterval }: {
  cacheFolder: string
  tti: number
  cleanupInterval: number
}) {
  fs.statSync(cacheFolder)

  const lastAccessMap = new Map<string, number>()

  return {
    cleanupJob$: rxjs.interval(cleanupInterval).pipe(
      rxjs.exhaustMap(cleanup)
    ),

    async get(hashKey: string) {
      try {
        const value = await fsp.readFile(path.join(cacheFolder, hashKey), 'utf8')
        lastAccessMap.set(hashKey, Date.now())
        return value
      } catch (err: any) {
        if (err.code != 'ENOENT') throw err
      }
    },

    async set(hashKey: string, value: string) {
      await fsp.writeFile(path.join(cacheFolder, hashKey), value)
      lastAccessMap.set(hashKey, Date.now())
    }
  }


  async function cleanup() {
    const now = Date.now()
    const filesDeleted: string[] = []
    for (const hashKey of await fsp.readdir(cacheFolder)) {
      const lastAccess = lastAccessMap.get(hashKey)
      if (lastAccess) {
        //if entry is idle, remove
        if (lastAccess + tti <= now) {
          await fsp.rm(path.join(cacheFolder, hashKey))
          lastAccessMap.delete(hashKey)
          filesDeleted.push(hashKey)
        }
      } else {
        //if entry's lastAccess isn't tracked, e.g. process restart, start tracking
        lastAccessMap.set(hashKey, now)
      }
    }
    return { filesDeleted }
  }
}
