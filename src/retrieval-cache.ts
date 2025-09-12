import fs from "fs"
import fsp from "fs/promises"
import path from "path"
import * as rxjs from "rxjs"

export interface AccessTracker {
  notifyAccess(): void
  isPurgeable(): boolean
}

export function makeRetrievalCache({ cacheFolder, cleanupInterval, makeAccessTracker }: {
  cacheFolder: string
  cleanupInterval: number
  makeAccessTracker(): AccessTracker
}) {
  fs.statSync(cacheFolder)

  const accessTrackers = new Map<string, AccessTracker>()

  return {
    cleanupJob$: rxjs.timer(0, cleanupInterval).pipe(
      rxjs.exhaustMap(cleanup)
    ),

    async get(hashKey: string) {
      try {
        const value = await fsp.readFile(path.join(cacheFolder, hashKey), 'utf8')
        accessTrackers.get(hashKey)?.notifyAccess()
        return value
      } catch (err: any) {
        if (err.code != 'ENOENT') throw err
      }
    },

    async set(hashKey: string, value: string) {
      await fsp.writeFile(path.join(cacheFolder, hashKey), value)
      accessTrackers.set(hashKey, makeAccessTracker())
    }
  }


  async function cleanup() {
    const filesDeleted: string[] = []
    for (const hashKey of await fsp.readdir(cacheFolder)) {
      const tracker = accessTrackers.get(hashKey)
      if (tracker) {
        if (tracker.isPurgeable()) {
          await fsp.rm(path.join(cacheFolder, hashKey))
          accessTrackers.delete(hashKey)
          filesDeleted.push(hashKey)
        }
      } else {
        //if entry isn't currently tracked, e.g. process restart, start tracking
        accessTrackers.set(hashKey, makeAccessTracker())
      }
    }
    return { filesDeleted }
  }
}
