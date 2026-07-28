/** 智能内容生成场景 - PortfolioContentGenerateSceneEnum */
export enum PortfolioContentGenerateSceneCode {
  LESSON_PLAN_FRAME = 'LESSON_PLAN_FRAME',
  COURSE_DESCRIPTION = 'COURSE_DESCRIPTION',
  REFLECTION_PROMPT = 'REFLECTION_PROMPT',
}

export const ALL_PORTFOLIO_CONTENT_GENERATE_SCENE_CODES: readonly PortfolioContentGenerateSceneCode[] = [
  PortfolioContentGenerateSceneCode.LESSON_PLAN_FRAME,
  PortfolioContentGenerateSceneCode.COURSE_DESCRIPTION,
  PortfolioContentGenerateSceneCode.REFLECTION_PROMPT,
]

export const PortfolioContentGenerateSceneDescription: Record<PortfolioContentGenerateSceneCode, string> = {
  [PortfolioContentGenerateSceneCode.LESSON_PLAN_FRAME]: '教案框架生成',
  [PortfolioContentGenerateSceneCode.COURSE_DESCRIPTION]: '课程描述生成',
  [PortfolioContentGenerateSceneCode.REFLECTION_PROMPT]: '教学反思提示生成',
}
