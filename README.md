# s3-log-store
Use S3 as log-structured store for append-only data streams such as conversation chat logs.

Log entries are JSON-ified and appended to files in a work directory.

Log files are periodically synced to an S3 bucket, broken up into chunks of preset size, gzipped.

Entries are retrievable in reverse order, given offset and limit.

Consumers can subscribe to streams to get notification of new entries.

```typescript
import { makeLogStore } from '@lsdsoftware/s3-log-store

const logStore = makeLogStore<T>({
  workDirConfig: {
    dirPath: string,
    syncInterval: number,
    chunkSize: number,
    inactiveTtlDays: number
  },
  s3StoreConfig: {
    clientConfig: S3ClientConfig,
    bucket: string,
    folder: string
  },
  retrievalCacheConfig: {
    cacheFolder: string,
    cleanupInterval: number
    makeAccessTracker(): {
      notifyAccess(): void
      isPurgeable(): boolean
    }
  }
})

logStore.append(streamId: string, data: T): Promise<void>
logStore.retrieve(streamId: string, offset: number, limit: number): Promise<T[]>
logStore.subscribe(streamId: string): rxjs.Observable<T>
```

`streamId` must be filename safe.

`inactiveTtlDays` specifies the number of days of inactivity (no new entries) before the a stream is considered inactive and its data purged from the local working dataset.

The _retrievalCache_ is a filesystem cache for objects retrieved from S3. Entries are purged according to policy set by caller-supplied access trackers.
