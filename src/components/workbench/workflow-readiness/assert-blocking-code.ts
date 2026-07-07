import { isKnownWorkflowBlockingCode } from '@/components/workbench/workflow-readiness/types'

/** 断言 blocking code 为已知枚举，否则抛错（禁止静默兜底）。 */
export function assertKnownWorkflowBlockingCode(code: string, context: string): void {
  if (!isKnownWorkflowBlockingCode(code)) {
    throw new Error(`未知的工作流阻断项编码：${code}（${context}）`)
  }
}
