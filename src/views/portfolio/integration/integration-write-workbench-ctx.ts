import type { InjectionKey } from 'vue'

/** IntegrationWriteWorkbench 向次要面板提供的运行时上下文 */
export const INTEGRATION_WRITE_WORKBENCH_CTX: InjectionKey<Record<string, unknown>> =
  Symbol('INTEGRATION_WRITE_WORKBENCH_CTX')
