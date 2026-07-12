/** 培训推荐状态 - PortfolioTrainingRecommendStatusEnum */
export enum PortfolioTrainingRecommendStatusCode {
  PENDING = 'PENDING',
  ACCEPTED = 'ACCEPTED',
  DISMISSED = 'DISMISSED',
}

export const PortfolioTrainingRecommendStatusDescription: Record<PortfolioTrainingRecommendStatusCode, string> = {
  [PortfolioTrainingRecommendStatusCode.PENDING]: '待采纳',
  [PortfolioTrainingRecommendStatusCode.ACCEPTED]: '已采纳',
  [PortfolioTrainingRecommendStatusCode.DISMISSED]: '已忽略',
}
