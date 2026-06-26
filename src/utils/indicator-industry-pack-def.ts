/** 行业包定义的可视化编辑模型（对应 packDefJson 核心可维护字段） */
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

export function parseIndustryPackDefJson(
  packCode: string,
  packName: string,
  packVersion: string,
  json: string,
): PortfolioIndustryPackDefForm {
  const form: PortfolioIndustryPackDefForm = {
    packId: packCode,
    packName,
    version: packVersion,
    applicableMajorsText: '',
    materialRequiredText: '',
    materialOptionalText: '',
  }
  if (!json.trim()) {
    return form
  }
  const raw = JSON.parse(json) as {
    packId?: string
    packName?: string
    version?: string
    applicableMajors?: string[]
    weights?: Record<string, number>
    materialChecklist?: { required?: string[], optional?: string[] }
  }
  form.packId = raw.packId ?? packCode
  form.packName = raw.packName ?? packName
  form.version = raw.version ?? packVersion
  form.applicableMajorsText = listToLines(raw.applicableMajors)
  form.weightEnterprisePractice = raw.weights?.enterprisePractice
  form.weightQualification = raw.weights?.qualification
  form.weightIndustryProject = raw.weights?.industryProject
  form.weightTeachingContribution = raw.weights?.teachingContribution
  form.weightSocialService = raw.weights?.socialService
  form.weightTrainingDevelopment = raw.weights?.trainingDevelopment
  form.materialRequiredText = listToLines(raw.materialChecklist?.required)
  form.materialOptionalText = listToLines(raw.materialChecklist?.optional)
  return form
}

/** 保留种子 dictionary / assessmentTemplate，仅更新表单可维护字段 */
export function mergeIndustryPackDefJson(form: PortfolioIndustryPackDefForm, existingJson: string): string {
  const base = existingJson.trim()
    ? JSON.parse(existingJson) as Record<string, unknown>
    : {}
  const weights = (base.weights as Record<string, number> | undefined) ?? {}
  if (form.weightEnterprisePractice !== undefined) {
    weights.enterprisePractice = form.weightEnterprisePractice
  }
  if (form.weightQualification !== undefined) {
    weights.qualification = form.weightQualification
  }
  if (form.weightIndustryProject !== undefined) {
    weights.industryProject = form.weightIndustryProject
  }
  if (form.weightTeachingContribution !== undefined) {
    weights.teachingContribution = form.weightTeachingContribution
  }
  if (form.weightSocialService !== undefined) {
    weights.socialService = form.weightSocialService
  }
  if (form.weightTrainingDevelopment !== undefined) {
    weights.trainingDevelopment = form.weightTrainingDevelopment
  }
  const materialChecklist = (base.materialChecklist as Record<string, string[]> | undefined) ?? {}
  materialChecklist.required = linesToList(form.materialRequiredText)
  materialChecklist.optional = linesToList(form.materialOptionalText)
  const payload = {
    ...base,
    packId: form.packId.trim() || base.packId,
    packName: form.packName.trim() || base.packName,
    version: form.version.trim() || base.version,
    applicableMajors: linesToList(form.applicableMajorsText),
    weights,
    materialChecklist,
  }
  return JSON.stringify(payload)
}

export function buildNewIndustryPackDefJson(form: PortfolioIndustryPackDefForm): string {
  return mergeIndustryPackDefJson(form, '{}')
}
