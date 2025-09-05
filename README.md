# s3-log-store
Use S3 as log-structured store for append-only data streams such as conversation chat logs.

Log entries are JSON-ified and appended to files in a work directory, and periodically sync'd to the configured S3 bucket, broken up into chunks of predefined size.

Entries are retrieved in reverse order, provided offset and limit.

Consumers can subscribe to a stream to get notified of new entries.

```typescript
import { makeLogStore } from '@lsdsoftware/s3-log-store

const logStore = makeLogStore<T>({
  workDirPath: string,
  syncInterval: number,
  s3Config: {
    profile: string,
    region: string,
    bucket: string,
    folder: string
  },
  chunkSize: number,
  inactiveTtlDays: number,
  retrievalCacheConfig: {
    cacheFolder: string,
    tti: number,
    cleanupInterval: number
  }
})

logStore.append(streamId: string, data: T): Promise<void>
logStore.retrieve(streamId: string, offset: number, limit: number): Promise<T[]>
logStore.subscribe(streamId: string): rxjs.Observable<T>
```

`streamId` must be filename safe.

`inactiveTtlDays` specifies the number of days of inactivity (no new entries) before the a stream is considered inactive and purged from the local working dataset.

The _retrievalCache_ is a time-to-idle filesystem cache that purges items based on how long it's been idle (not accessed), as specified by the `tti` parameter.
