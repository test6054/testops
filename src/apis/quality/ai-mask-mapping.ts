/**
 * AI 脱敏映射 API - 对应 AiMaskMappingController
 * 后端路径：/api/quality/ai-mask-mappings
 *
 * 设计文档 §8.3：AI 大模型只能看到脱敏后的业务数据；脱敏映射以 AES-256-GCM 加密保存，
 * 仅授权角色（审计 / 质量办）可通过 reveal 反脱敏查看原文。
 */
import http from '@/config/axios'

const BASE = '/api/quality/ai-mask-mappings'

export interface AiMaskMappingVO {
  id: string
  tenantId?: string
  aiTaskId: string
  businessType: string
  businessId: string
  cipherPayload: string
  cipherIv: string
  createTime?: string
  updateTime?: string
}

export interface AiMaskMappingRevealVO {
  aiTaskId: string
  businessType: string
  businessId: string
  /** 占位符 → 明文 */
  mapping: Record<string, string>
  plaintextJson: string
}

export interface AiMaskMappingSavePayload {
  aiTaskId: string
  businessType: string
  businessId: string
  cipherPayload: string
  cipherIv: string
}

export const aiMaskMappingApi = {
  detail: (id: string) =>
    http.post<AiMaskMappingVO>(`${BASE}/detail`, { id }),
  /** 按 AI 任务取密文映射（不含明文） */
  getByTask: (aiTaskId: string) =>
    http.post<AiMaskMappingVO | null>(`${BASE}/get-by-task`, { id: aiTaskId }),
  /** 反脱敏：按 AI 任务取明文映射，受权限控制 */
  reveal: (aiTaskId: string) =>
    http.post<AiMaskMappingRevealVO>(`${BASE}/reveal`, { id: aiTaskId }),
  create: (data: AiMaskMappingSavePayload) =>
    http.post<string>(`${BASE}/create`, data),
}
