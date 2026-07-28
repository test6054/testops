import type { FormalSessionResponse } from '@/apis/mark/marking-organization'
import { AllocationUnitCode } from '@/types/enums/allocation-unit-enum'

/** 正评会话题目范围展示文案 */
export function formatFormalSessionQuestionScope(session: FormalSessionResponse): string {
  if (session.allocationUnit === AllocationUnitCode.WHOLE_PAPER) {
    return '整卷批阅'
  }
  if (!session.questionScopes.length) {
    return '题目范围待启动固化'
  }
  const questionNos = session.questionScopes
    .map((scope) => {
      const progress
        = scope.scopedTaskCount > 0
          ? `（工作单元 ${scope.scopedFinalizedTaskCount}/${scope.scopedTaskCount}，成绩 ${scope.scopedConfirmedGradeCount}/${scope.scopedGradeItemCount}）`
          : ''
      return `题 ${scope.questionNo}${progress}`
    })
    .join('、')
  const prefix = session.allocationUnit === AllocationUnitCode.RANDOM_QUESTIONS ? '随机抽题' : '指定题目'
  return `${prefix} ${session.questionScopeCount} 题：${questionNos}`
}

/** 正评会话任务进度展示文案 */
export function formatFormalSessionTaskProgress(session: FormalSessionResponse): string {
  if (session.totalTaskCount <= 0) {
    return '阅卷工作单元待生成'
  }
  let text = `${session.completionScopeLabel} 已完成 ${session.finalizedTaskCount}/${session.totalTaskCount}`
  if (session.recycledTaskCount > 0) {
    text += `，回收待处理 ${session.recycledTaskCount} 个`
  }
  return text
}

/** 正评会话成绩闭环展示文案 */
export function formatFormalSessionGradeClosureProgress(session: FormalSessionResponse): string {
  if (session.sessionGradeItemCount <= 0) {
    return '会话成绩闭环待形成'
  }
  return `${session.sessionGradeClosureLabel} ${session.sessionConfirmedGradeCount}/${session.sessionGradeItemCount}`
}
