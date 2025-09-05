import { makeWorkDir } from "./work-dir.js"

export function makeDeleteInactiveTask({ workDir, inactiveTtlDays }: {
  workDir: ReturnType<typeof makeWorkDir>
  inactiveTtlDays: number
}) {
  return {
    async run() {
      const fileNames = await workDir.deleteInactive(inactiveTtlDays)
      return { filesDeleted: fileNames }
    }
  }
}
