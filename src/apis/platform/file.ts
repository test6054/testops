import type { FileUploadSceneKey } from './scene-keys'
import type { PlatformFileStageVO } from './types'
import http from '@/config/axios'

/**
 * 平台文件暂存（浏览器 multipart 唯一 ingress）。
 */
export function stagePlatformFile(sceneKey: FileUploadSceneKey, file: File): Promise<PlatformFileStageVO> {
  const formData = new FormData()
  formData.append('sceneKey', sceneKey)
  formData.append('file', file, file.name)
  return http.post<PlatformFileStageVO>('/api/storage/platform/file/stage', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
}
