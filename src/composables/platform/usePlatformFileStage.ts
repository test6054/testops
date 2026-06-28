import type { FileUploadSceneKey } from '@/apis/platform/scene-keys'
import { stagePlatformFile } from '@/apis/platform/file'

/** 平台文件暂存，返回 fileNodeId / fileName / fileSize 契约字段。 */
export async function stageBusinessFile(sceneKey: FileUploadSceneKey, file: File) {
  const staged = await stagePlatformFile(sceneKey, file)
  return {
    id: staged.fileNodeId,
    nodeName: staged.fileName,
    fileSize: staged.fileSize,
  }
}
