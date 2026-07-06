/** OCR 识别场景编码 - 与后端 MarkOcrScene.code 完全一致 */
export type MarkOcrSceneCode
  = 'CHOICE'
    | 'TRUE_FALSE'
    | 'FILL_BLANK'
    | 'NUMERIC'
    | 'TERM_EXPLANATION'
    | 'SHORT_ANSWER'
    | 'ESSAY'
    | 'CALCULATION'
    | 'PROOF'
    | 'CASE_ANALYSIS'
    | 'MEDICAL_CASE'
    | 'DESIGN'
    | 'PROGRAMMING'
    | 'DRAWING'
    | 'TABLE_CHART'
    | 'GENERAL_TEXT'

/** OCR 场景文案 - 与后端 MarkOcrScene.message 完全一致 */
export const MARK_OCR_SCENE_LABEL: Record<MarkOcrSceneCode, string> = {
  CHOICE: '选择题',
  TRUE_FALSE: '判断题',
  FILL_BLANK: '填空题',
  NUMERIC: '数值题',
  TERM_EXPLANATION: '名词解释',
  SHORT_ANSWER: '简答题',
  ESSAY: '论述题',
  CALCULATION: '计算题',
  PROOF: '证明题',
  CASE_ANALYSIS: '案例分析',
  MEDICAL_CASE: '病案分析',
  DESIGN: '设计题',
  PROGRAMMING: '编程题',
  DRAWING: '作图题',
  TABLE_CHART: '图表题',
  GENERAL_TEXT: '通用文本题',
}
