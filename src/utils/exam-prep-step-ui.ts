import type { ExamDetailResponse } from '@/apis/mark/exam'
import type { ExamLayoutDocument } from '@/apis/mark/exam-layout-design'
import type { ExamWorkbenchPrepStepResponse } from '@/apis/mark/exam-progress'
import type { WorkbenchStageStatus } from '@/types/workbench'
import { ExamMaterialLayoutModeDescription, ExamPrintSourceModeDescription } from '@/apis/mark/exam'
import { resolveDefaultLayoutDesignPhase, resolvePrepStepLayoutDesignPhase } from '@/utils/layout-design-workspace'
import { strictEnumLabel } from '@/utils/strict-enum'

/** 考试准备页步骤卡片：后端诊断步骤 + 前端路由与操作文案 */
export interface PrepStepCard {
  key: string
  title: string
  description: string
  status: WorkbenchStageStatus
  statusText: string
  routeName: string
  primaryAction: string
  advisoryReason?: string
}

export interface PrepStepRouteLocation {
  name: string
  query?: Record<string, string>
}

/** 准备步骤 key → 工作台路由名真源，供 snapshot 级 workflow 映射复用。 */
export const PREP_STEP_ROUTE_BY_KEY: Readonly<Record<string, string>> = {
  materialLayout: 'TeacherExamWorkspacePrep',
  candidateRoster: 'TeacherExamWorkspaceCandidateRoster',
  paperTemplate: 'TeacherExamWorkspaceLayoutDesigner',
  layoutDesign: 'TeacherExamWorkspaceLayoutDesigner',
  printPackage: 'TeacherExamWorkspacePrintPackage',
  experienceAssist: 'TeacherExamWorkspaceMarkingExperienceAssistPolicy',
}

export function resolvePrepStepRouteName(stepKey: string): string {
  const routeName = PREP_STEP_ROUTE_BY_KEY[stepKey]
  if (!routeName) {
    throw new Error(`未知准备步骤键：${stepKey}`)
  }
  return routeName
}

/** 准备步骤 deep link：制卷设计器步骤携带 phase query。 */
export function resolvePrepStepRouteLocation(
  stepKey: string,
  detail: ExamDetailResponse,
  document?: ExamLayoutDocument | null,
): PrepStepRouteLocation {
  const name = resolvePrepStepRouteName(stepKey)
  if (stepKey === 'paperTemplate' && name === 'TeacherExamWorkspaceLayoutDesigner') {
    return {
      name,
      query: { phase: resolveDefaultLayoutDesignPhase(detail, document ?? null) },
    }
  }
  if (stepKey === 'layoutDesign' && name === 'TeacherExamWorkspaceLayoutDesigner') {
    return {
      name,
      query: { phase: resolvePrepStepLayoutDesignPhase(detail, document ?? null) },
    }
  }
  return { name }
}

function resolvePrepStepDescription(step: ExamWorkbenchPrepStepResponse, detail: ExamDetailResponse): string {
  switch (step.key) {
    case 'materialLayout':
      if (!detail.materialLayoutMode) {
        return '可选：配置单独试卷或试卷+答题页，用于增强扫描识别与空白送印；未配置也可先扫描登记'
      }
      return `${strictEnumLabel(ExamMaterialLayoutModeDescription, detail.materialLayoutMode, '制卷形态')}，${
        detail.printSourceMode
          ? strictEnumLabel(ExamPrintSourceModeDescription, detail.printSourceMode, '印刷来源')
          : '试题卷与答题页分册，可配置空白答题页'
      }`
    case 'candidateRoster':
      if (detail.candidateCount > 0) {
        const scopeHint = detail.classScopePersisted
          ? `${detail.classIds.length} 个参考班级`
          : `${detail.classIds.length} 个班级（名册推断，尚未保存参考班级）`
        return `已绑定 ${detail.candidateCount} 名考生 / ${scopeHint}`
      }
      return '独立能力：卷面由考生自填身份，OCR 自动识别；名册可后补用于匹配与成绩，不阻断扫描与印刷'
    case 'paperTemplate': {
      const hasQuestions = detail.questionCount > 0
      if (!hasQuestions) {
        return '未预配题目时，身份绑定后将按扫描页推导页级题目，后续可继续补录题目与答案'
      }
      const answersComplete = detail.answerCount >= detail.questionCount
      const subjectivePending = (detail.subjectiveQuestionCount ?? 0) > 0 && detail.subjectiveRegionReady !== true
      if (answersComplete && !subjectivePending) {
        return `已配置 ${detail.questionCount} 道题、标准答案与主观题区域`
      }
      if (answersComplete && subjectivePending) {
        return '标准答案已齐，请补录主观题区域坐标'
      }
      return `已录入 ${detail.questionCount} 道题，标准答案 ${detail.answerCount}/${detail.questionCount}`
    }
    case 'layoutDesign':
      if (detail.materialLayoutMode === 'ANSWER_SHEET') {
        return detail.pageTemplateReady === true
          ? `答题页已配置 ${detail.totalPages ?? 0} 页；考后试卷与答题页一起扫描登记`
          : '上传答题页 PDF 或生成标准空白答题页，配置密封线身份区与作答区'
      }
      {
        const layoutReady = detail.layoutConfigured === true && detail.layoutRegionReady === true
        const pageSynced = detail.pageTemplateReady === true
        if (layoutReady && pageSynced) {
          return `单独试卷母版「${detail.layoutName ?? ''}」已就绪，${detail.totalPages ?? 0} 页已同步`
        }
        if (layoutReady) {
          return '单独试卷 PDF 已上传，请确认身份区 / 客观作答区并等待拆页同步'
        }
        return '上传与印制版一致的整卷 PDF，配置身份区与客观作答区'
      }
    case 'printPackage':
      return (detail.printPackageCount ?? 0) > 0
        ? `已生成 ${detail.printPackageCount} 个空白印刷母版，可按座位送印`
        : detail.materialLayoutMode === 'ANSWER_SHEET'
          ? '生成空白答题页母版按考场座位送印；考生领卷后自行填写身份，不依赖名册'
          : '生成空白印刷母版按考场座位送印；考生领卷后自行填写身份，不依赖名册'
    case 'experienceAssist':
      return step.status === 'completed'
        ? '本场经验辅助评阅策略已配置'
        : '试评完成后定标，正考同课相似题可自动匹配历史定标经验'
    default:
      return step.statusText
  }
}

function resolvePrimaryAction(step: ExamWorkbenchPrepStepResponse, detail: ExamDetailResponse): string {
  const completed = step.status === 'completed'
  switch (step.key) {
    case 'materialLayout':
      return completed ? '调整形态' : '选择形态'
    case 'candidateRoster':
      return completed ? '查看 / 调整' : '配置考生名册'
    case 'paperTemplate': {
      if (completed) return '查看 / 调整'
      const hasQuestions = detail.questionCount > 0
      if (!hasQuestions) return '录入题目（可选）'
      const answersComplete = detail.answerCount >= detail.questionCount
      const subjectivePending = (detail.subjectiveQuestionCount ?? 0) > 0 && detail.subjectiveRegionReady !== true
      if (answersComplete && subjectivePending) return '配置主观题区域'
      return '补录标准答案'
    }
    case 'layoutDesign':
      return completed ? '打开制卷设计器' : '配置制卷设计'
    case 'printPackage':
      return completed ? '查看 / 调整' : '生成印刷包'
    case 'experienceAssist':
      return completed ? '查看策略' : '配置经验辅助'
    default:
      return completed ? '查看 / 调整' : '前往配置'
  }
}

/**
 * 将后端工作台准备诊断步骤映射为准备页卡片模型；状态与建议项以服务端为准。
 * detail 缺失时仍渲染快照步骤（描述退回 statusText），禁止因详情失败整页空态。
 */
export function buildPrepStepCards(
  backendSteps: ExamWorkbenchPrepStepResponse[],
  detail: ExamDetailResponse | null,
): PrepStepCard[] {
  return backendSteps.map((step) => {
    const routeName = PREP_STEP_ROUTE_BY_KEY[step.key]
    if (!routeName) {
      throw new Error(`未知准备步骤键：${step.key}`)
    }
    return {
      key: step.key,
      title: step.title,
      description: detail
        ? resolvePrepStepDescription(step, detail)
        : (step.statusText?.trim() || '考试详情未加载，步骤状态以快照为准'),
      status: step.status,
      statusText: step.statusText,
      routeName,
      primaryAction: detail
        ? resolvePrimaryAction(step, detail)
        : (step.status === 'completed' ? '查看' : '前往配置'),
      advisoryReason: step.advisoryReason ?? undefined,
    }
  })
}
