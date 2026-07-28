import type { ExamLayoutDocument } from '@/apis/mark/exam-layout-design'

/**
 * 制卷文档持久化指纹：用于 dirty 判定，不得用 layoutPersisted 代替。
 */
export function fingerprintLayoutDocument(document: ExamLayoutDocument | null | undefined): string {
  if (!document) {
    return ''
  }
  return JSON.stringify(document)
}
