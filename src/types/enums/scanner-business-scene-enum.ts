/** 统一文档采集业务场景 - 与 edu-mark DocumentBusinessScene 对齐 */
export enum ScannerBusinessSceneCode {
  EXAM_DIRECT_SCAN = 'EXAM_DIRECT_SCAN',
  EXAM_ARCHIVE = 'EXAM_ARCHIVE',
  COURSE_ASSESSMENT_ARCHIVE = 'COURSE_ASSESSMENT_ARCHIVE',
  TEACHER_PORTFOLIO = 'TEACHER_PORTFOLIO',
  FULLTEXT_IMPORT = 'FULLTEXT_IMPORT',
}

export const ALL_SCANNER_BUSINESS_SCENE_CODES: readonly ScannerBusinessSceneCode[] = [
  ScannerBusinessSceneCode.EXAM_DIRECT_SCAN,
  ScannerBusinessSceneCode.EXAM_ARCHIVE,
  ScannerBusinessSceneCode.COURSE_ASSESSMENT_ARCHIVE,
  ScannerBusinessSceneCode.TEACHER_PORTFOLIO,
  ScannerBusinessSceneCode.FULLTEXT_IMPORT,
]

