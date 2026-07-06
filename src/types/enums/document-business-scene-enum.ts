/** 文档业务场景 */
export enum DocumentBusinessSceneCode {
  EXAM_DIRECT_SCAN = 'EXAM_DIRECT_SCAN',
  EXAM_ARCHIVE = 'EXAM_ARCHIVE',
  COURSE_ASSESSMENT_ARCHIVE = 'COURSE_ASSESSMENT_ARCHIVE',
  TEACHER_PORTFOLIO = 'TEACHER_PORTFOLIO',
  FULLTEXT_IMPORT = 'FULLTEXT_IMPORT',
}

export const ALL_DOCUMENT_BUSINESS_SCENE_CODES: readonly DocumentBusinessSceneCode[] = [
  DocumentBusinessSceneCode.EXAM_DIRECT_SCAN,
  DocumentBusinessSceneCode.EXAM_ARCHIVE,
  DocumentBusinessSceneCode.COURSE_ASSESSMENT_ARCHIVE,
  DocumentBusinessSceneCode.TEACHER_PORTFOLIO,
  DocumentBusinessSceneCode.FULLTEXT_IMPORT,
]
export const DocumentBusinessSceneDescription: Record<DocumentBusinessSceneCode, string> = {
  [DocumentBusinessSceneCode.EXAM_DIRECT_SCAN]: '试卷直扫',
  [DocumentBusinessSceneCode.EXAM_ARCHIVE]: '考试归档',
  [DocumentBusinessSceneCode.COURSE_ASSESSMENT_ARCHIVE]: '课程考核归档',
  [DocumentBusinessSceneCode.TEACHER_PORTFOLIO]: '教师档案袋',
  [DocumentBusinessSceneCode.FULLTEXT_IMPORT]: '全文导入',
}


