import type {
  PortfolioIndustryPackAssessmentTemplateDto,
  PortfolioIndustryPackDefDto,
  PortfolioIndustryPackDictionaryDto,
  PortfolioIndustryPackWeightsDto,
} from '@/apis/portfolio/indicator-types'
import { PortfolioIndustryPackAssessmentSectionCode } from '@/types/enums/portfolio-industry-pack-assessment-section-code-enum'
import { PortfolioIndustryPackDictSectionCode } from '@/types/enums/portfolio-industry-pack-dict-section-code-enum'
import { PortfolioIndustryPackWeightCode } from '@/types/enums/portfolio-industry-pack-weight-code-enum'
import { showFormValidationMessage } from '@/utils/error-handler'

/** 行业包定义可视化编辑模型（映射 packDef 可维护字段） */
export interface PortfolioIndustryPackDefForm {
  packId: string
  packName: string
  version: string
  applicableMajorsText: string
  weightEnterprisePractice?: number
  weightQualification?: number
  weightIndustryProject?: number
  weightTeachingContribution?: number
  weightSocialService?: number
  weightTrainingDevelopment?: number
  materialRequiredText: string
  materialOptionalText: string
}

function linesToList(text: string): string[] {
  return text.split('\n').map(line => line.trim()).filter(Boolean)
}

function listToLines(items: string[] | undefined): string {
  return items?.join('\n') ?? ''
}

/** 将 API packDef 映射为表单模型 */
export function toIndustryPackDefForm(def: PortfolioIndustryPackDefDto): PortfolioIndustryPackDefForm {
  return {
    packId: def.packId,
    packName: def.packName,
    version: def.version,
    applicableMajorsText: listToLines(def.applicableMajors),
    weightEnterprisePractice: def.weights?.enterprisePractice,
    weightQualification: def.weights?.qualification,
    weightIndustryProject: def.weights?.industryProject,
    weightTeachingContribution: def.weights?.teachingContribution,
    weightSocialService: def.weights?.socialService,
    weightTrainingDevelopment: def.weights?.trainingDevelopment,
    materialRequiredText: listToLines(def.materialChecklist?.required),
    materialOptionalText: listToLines(def.materialChecklist?.optional),
  }
}

function emptyDictionary(): PortfolioIndustryPackDictionaryDto {
  return {
    sections: [
      { sectionCode: PortfolioIndustryPackDictSectionCode.ENTERPRISE_PRACTICE, categories: [] },
      { sectionCode: PortfolioIndustryPackDictSectionCode.QUALIFICATION, categories: [] },
      { sectionCode: PortfolioIndustryPackDictSectionCode.INDUSTRY_PROJECT, categories: [] },
    ],
  }
}

function defaultAssessment(packCode: string): PortfolioIndustryPackAssessmentTemplateDto {
  return {
    templateId: `${packCode}_annual`,
    sections: [
      {
        sectionCode: PortfolioIndustryPackAssessmentSectionCode.PRACTICE,
        title: '企业实践',
        fieldRefs: [PortfolioIndustryPackWeightCode.ENTERPRISE_PRACTICE],
      },
      {
        sectionCode: PortfolioIndustryPackAssessmentSectionCode.QUALIFICATION,
        title: '职业资格',
        fieldRefs: [PortfolioIndustryPackWeightCode.QUALIFICATION],
      },
      {
        sectionCode: PortfolioIndustryPackAssessmentSectionCode.PROJECT,
        title: '产教融合',
        fieldRefs: [PortfolioIndustryPackWeightCode.INDUSTRY_PROJECT],
      },
      {
        sectionCode: PortfolioIndustryPackAssessmentSectionCode.TEACHING,
        title: '教学贡献',
        fieldRefs: [PortfolioIndustryPackWeightCode.TEACHING_CONTRIBUTION],
      },
      {
        sectionCode: PortfolioIndustryPackAssessmentSectionCode.SERVICE,
        title: '社会服务',
        fieldRefs: [PortfolioIndustryPackWeightCode.SOCIAL_SERVICE],
      },
    ],
  }
}

/**
 * 由表单组装完整 packDef；编辑时保留已有 dictionary / assessmentTemplate。
 */
export function buildIndustryPackDefFromForm(
  form: PortfolioIndustryPackDefForm,
  existing?: PortfolioIndustryPackDefDto | null,
): PortfolioIndustryPackDefDto | null {
  const packId = form.packId.trim()
  const packName = form.packName.trim()
  const version = form.version.trim()
  const applicableMajors = linesToList(form.applicableMajorsText)
  const required = linesToList(form.materialRequiredText)
  const optional = linesToList(form.materialOptionalText)
  if (!packId || !packName || !version) {
    showFormValidationMessage('行业包定义缺少编码、名称或版本')
    return null
  }
  if (applicableMajors.length === 0) {
    showFormValidationMessage('请至少填写一个适用专业')
    return null
  }
  if (required.length === 0 && optional.length === 0) {
    showFormValidationMessage('请至少填写一项材料清单')
    return null
  }
  if (
    typeof form.weightEnterprisePractice !== 'number'
    || typeof form.weightQualification !== 'number'
    || typeof form.weightIndustryProject !== 'number'
    || typeof form.weightTeachingContribution !== 'number'
    || typeof form.weightSocialService !== 'number'
    || typeof form.weightTrainingDevelopment !== 'number'
  ) {
    showFormValidationMessage('请填写全部六维权重')
    return null
  }
  const weights: PortfolioIndustryPackWeightsDto = {
    enterprisePractice: form.weightEnterprisePractice,
    qualification: form.weightQualification,
    industryProject: form.weightIndustryProject,
    teachingContribution: form.weightTeachingContribution,
    socialService: form.weightSocialService,
    trainingDevelopment: form.weightTrainingDevelopment,
  }
  return {
    packId,
    packName,
    version,
    applicableMajors,
    dictionary: existing?.dictionary ?? emptyDictionary(),
    weights,
    assessmentTemplate: existing?.assessmentTemplate ?? defaultAssessment(packId),
    materialChecklist: {
      required,
      optional,
    },
  }
}
