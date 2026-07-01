import type { ExamDetailVO } from '@/apis/mark/exam'
import { EXAM_MATERIAL_LAYOUT_MODE_LABEL, EXAM_PRINT_SOURCE_MODE_LABEL } from '@/apis/mark/exam'
import type { ExamWorkbenchPrepStepVO } from '@/apis/mark/exam-progress'
import type { WorkbenchStageStatus } from '@/types/workbench'
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
}

function resolvePrepStepDescription(step: ExamWorkbenchPrepStepVO, detail: ExamDetailVO): string {
  switch (step.key) {
    case 'materialLayout':
      if (!detail.materialLayoutMode) {
        return '先确定答卷页或整卷作答形态，后续扫描、身份识别与印刷包都按该形态执行'
      }
      return `${strictEnumLabel(EXAM_MATERIAL_LAYOUT_MODE_LABEL, detail.materialLayoutMode, '制卷形态')}，${
        detail.printSourceMode
          ? strictEnumLabel(EXAM_PRINT_SOURCE_MODE_LABEL, detail.printSourceMode, '印刷来源')
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
        const masterReady = detail.masterConfigured === true && detail.masterRegionReady === true
        const pageSynced = detail.pageTemplateReady === true
        if (masterReady && pageSynced) {
          return `制卷设计「${detail.masterName ?? ''}」已就绪，${detail.totalPages ?? 0} 页已同步`
        }
        if (masterReady) {
          return '整卷 PDF 已上传，请确认身份区 / 客观填涂区并等待拆页同步'
        }
        return '上传整卷 PDF 并完成制卷设计，配置身份区与客观题填涂区'
      }
    case 'printPackage':
      return (detail.printPackageCount ?? 0) > 0
        ? `已生成 ${detail.printPackageCount} 个印刷包`
        : '按考生名册生成个性化印刷 PDF'
    default:
      return step.statusText
  }
}

function resolvePrimaryAction(step: ExamWorkbenchPrepStepVO, detail: ExamDetailVO): string {
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
    default:
      return completed ? '查看 / 调整' : '前往配置'
  }
}

/**
 * 将后端工作台准备诊断步骤映射为准备页卡片模型；状态与建议项以服务端为准。
 */
export function buildPrepStepCards(
  backendSteps: ExamWorkbenchPrepStepVO[],
  detail: ExamDetailVO,
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
