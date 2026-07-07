import type { ExamDetailResponse } from '@/apis/mark/exam'
import type { ExamWorkbenchPrepStepResponse } from '@/apis/mark/exam-progress'
import type { WorkbenchStageStatus } from '@/types/workbench'
import { ExamMaterialLayoutModeDescription, ExamPrintSourceModeDescription } from '@/apis/mark/exam'
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

const PREP_STEP_ROUTES: Record<string, string> = {
  materialLayout: 'TeacherExamWorkspacePrep',
  candidateRoster: 'TeacherExamWorkspaceCandidateRoster',
  paperTemplate: 'TeacherExamWorkspaceLayoutDesigner',
  layoutDesign: 'TeacherExamWorkspaceLayoutDesigner',
  printPackage: 'TeacherExamWorkspacePrintPackage',
  experienceAssist: 'TeacherExamWorkspaceMarkingExperienceAssistPolicy',
}

/** 准备步骤 key → 工作台路由名真源，供 snapshot 级 workflow 映射复用。 */
export const PREP_STEP_ROUTE_BY_KEY: Readonly<Record<string, string>> = PREP_STEP_ROUTES

export function resolvePrepStepRouteName(stepKey: string): string {
  const routeName = PREP_STEP_ROUTE_BY_KEY[stepKey]
  if (!routeName) {
    throw new Error(`未知准备步骤键：${stepKey}`)
  }
  return routeName
}

function resolvePrepStepDescription(step: ExamWorkbenchPrepStepResponse, detail: ExamDetailResponse): string {
  switch (step.key) {
    case 'materialLayout':
      if (!detail.materialLayoutMode) {
        return '先确定答卷页或整卷作答形态，后续扫描、身份识别与印刷包都按该形态执行'
      }
      return `${strictEnumLabel(ExamMaterialLayoutModeDescription, detail.materialLayoutMode, '制卷形态')}，${
        detail.printSourceMode
          ? strictEnumLabel(ExamPrintSourceModeDescription, detail.printSourceMode, '印刷来源')
          : '无需系统印刷'
      }`
    case 'candidateRoster':
      if (detail.candidateCount > 0) {
        const scopeHint = detail.classScopePersisted
          ? `${detail.classIds.length} 个参考班级`
          : `${detail.classIds.length} 个班级（名册推断，尚未保存参考班级）`
        return `已绑定 ${detail.candidateCount} 名考生 / ${scopeHint}`
      }
      return '导入考生名册，缺失学生用户会在导入提交时创建为租户学生账号'
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
          ? `已配置 ${detail.totalPages ?? 0} 页扫描底图`
          : '上传答卷页并完成制卷设计，供扫描对齐与坐标缩放'
      }
      {
        const layoutReady = detail.layoutConfigured === true && detail.layoutRegionReady === true
        const pageSynced = detail.pageTemplateReady === true
        if (layoutReady && pageSynced) {
          return `制卷设计「${detail.layoutName ?? ''}」已就绪，${detail.totalPages ?? 0} 页已同步`
        }
        if (layoutReady) {
          return '整卷 PDF 已上传，请确认身份区 / 客观填涂区并等待拆页同步'
        }
        return '上传整卷 PDF 并完成制卷设计，配置身份区与客观题填涂区'
      }
    case 'printPackage':
      return (detail.printPackageCount ?? 0) > 0
        ? `已生成 ${detail.printPackageCount} 个印刷包`
        : '按考生名册生成个性化印刷 PDF'
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
 */
export function buildPrepStepCards(
  backendSteps: ExamWorkbenchPrepStepResponse[],
  detail: ExamDetailResponse,
): PrepStepCard[] {
  return backendSteps.map((step) => {
    const routeName = PREP_STEP_ROUTES[step.key]
    if (!routeName) {
      throw new Error(`未知准备步骤键：${step.key}`)
    }
    return {
      key: step.key,
      title: step.title,
      description: resolvePrepStepDescription(step, detail),
      status: step.status,
      statusText: step.statusText,
      routeName,
      primaryAction: resolvePrimaryAction(step, detail),
      advisoryReason: step.advisoryReason ?? undefined,
    }
  })
}
