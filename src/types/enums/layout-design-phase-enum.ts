/**
 * 制卷设计器工作台阶段
 */
export enum LayoutDesignPhaseCode {
  SOURCE = 'source',
  QUESTIONS = 'questions',
  LAYOUT = 'layout',
  REVIEW = 'review',
}

export const ALL_LAYOUT_DESIGN_PHASE_CODES = [
  LayoutDesignPhaseCode.SOURCE,
  LayoutDesignPhaseCode.QUESTIONS,
  LayoutDesignPhaseCode.LAYOUT,
  LayoutDesignPhaseCode.REVIEW,
] as const

export const LayoutDesignPhaseDescription: Record<LayoutDesignPhaseCode, string> = {
  [LayoutDesignPhaseCode.SOURCE]: '资料入口',
  [LayoutDesignPhaseCode.QUESTIONS]: '题目结构',
  [LayoutDesignPhaseCode.LAYOUT]: '版式划区',
  [LayoutDesignPhaseCode.REVIEW]: '校验预览',
}

export function requireLayoutDesignPhaseCode(value: string): LayoutDesignPhaseCode {
  const code = ALL_LAYOUT_DESIGN_PHASE_CODES.find((item) => item === value)
  if (!code) {
    throw new Error(`非法制卷设计阶段：${value}`)
  }
  return code
}
