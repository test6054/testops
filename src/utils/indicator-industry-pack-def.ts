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

function readStringProperty(source: object, key: string): string | undefined {
  const value = Object.getOwnPropertyDescriptor(source, key)?.value
  return typeof value === 'string' ? value : undefined
}

function readStringArrayProperty(source: object, key: string): string[] | undefined {
  const value = Object.getOwnPropertyDescriptor(source, key)?.value
  if (!Array.isArray(value)) {
    return undefined
  }
  return value.every((item) => typeof item === 'string') ? value : undefined
}

function readObjectProperty(source: object, key: string): object | undefined {
  const value = Object.getOwnPropertyDescriptor(source, key)?.value
  return typeof value === 'object' && value !== null && !Array.isArray(value) ? value : undefined
}

function readNumberProperty(source: object | undefined, key: string): number | undefined {
  if (!source) {
    return undefined
  }
  const value = Object.getOwnPropertyDescriptor(source, key)?.value
  return typeof value === 'number' ? value : undefined
}

function readStringListFromObject(source: object | undefined, key: string): string[] | undefined {
  if (!source) {
    return undefined
  }
  return readStringArrayProperty(source, key)
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
  const raw: unknown = JSON.parse(json)
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    throw new Error('行业包定义 JSON 必须是对象')
  }
  const weights = readObjectProperty(raw, 'weights')
  const materialChecklist = readObjectProperty(raw, 'materialChecklist')
  form.packId = readStringProperty(raw, 'packId') ?? packCode
  form.packName = readStringProperty(raw, 'packName') ?? packName
  form.version = readStringProperty(raw, 'version') ?? packVersion
  form.applicableMajorsText = listToLines(readStringArrayProperty(raw, 'applicableMajors'))
  form.weightEnterprisePractice = readNumberProperty(weights, 'enterprisePractice')
  form.weightQualification = readNumberProperty(weights, 'qualification')
  form.weightIndustryProject = readNumberProperty(weights, 'industryProject')
  form.weightTeachingContribution = readNumberProperty(weights, 'teachingContribution')
  form.weightSocialService = readNumberProperty(weights, 'socialService')
  form.weightTrainingDevelopment = readNumberProperty(weights, 'trainingDevelopment')
  form.materialRequiredText = listToLines(readStringListFromObject(materialChecklist, 'required'))
  form.materialOptionalText = listToLines(readStringListFromObject(materialChecklist, 'optional'))
  return form
}

/** 保留种子 dictionary / assessmentTemplate，仅更新表单可维护字段 */
export function mergeIndustryPackDefJson(form: PortfolioIndustryPackDefForm, existingJson: string): string {
  const base: Record<string, unknown> = {}
  if (existingJson.trim()) {
    const parsed: unknown = JSON.parse(existingJson)
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      throw new Error('行业包定义 JSON 必须是对象')
    }
    for (const key of Object.keys(parsed)) {
      base[key] = Object.getOwnPropertyDescriptor(parsed, key)?.value
    }
  }
  const rawWeights = readObjectProperty(base, 'weights')
  const weights: Record<string, number> = {}
  if (rawWeights) {
    for (const key of Object.keys(rawWeights)) {
      const value = Object.getOwnPropertyDescriptor(rawWeights, key)?.value
      if (typeof value === 'number') {
        weights[key] = value
      }
    }
  }
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
  const rawMaterialChecklist = readObjectProperty(base, 'materialChecklist')
  const materialChecklist: Record<string, string[]> = {}
  if (rawMaterialChecklist) {
    for (const key of Object.keys(rawMaterialChecklist)) {
      const value = Object.getOwnPropertyDescriptor(rawMaterialChecklist, key)?.value
      if (Array.isArray(value) && value.every((item) => typeof item === 'string')) {
        materialChecklist[key] = value
      }
    }
  }
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
