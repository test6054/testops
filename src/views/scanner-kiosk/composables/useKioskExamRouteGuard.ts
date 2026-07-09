/**
 * 考试扫描 Kiosk 路由守卫：未确认本场考试时强制进入 /exam/bind。
 * 工位服务端已绑定考试也不自动跳过选考页，须用户点选并确认后再进入工作台。
 */
import type { ExamKioskWorkflow } from './useExamKioskWorkflow'
import { watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

export const SCANNER_EXAM_BIND_ROUTE = 'ScannerExamKioskBind'
export const SCANNER_EXAM_SETUP_ROUTE = 'ScannerExamKioskSetup'

export function useKioskExamRouteGuard(workflow: ExamKioskWorkflow) {
  const route = useRoute()
  const router = useRouter()

  watch(
    () =>
      [
        workflow.examBindingBootstrapPending.value,
        workflow.needsActivationGate.value,
        workflow.needsExamBindingGate.value,
        route.name,
      ] as const,
    ([bootstrapPending, activationGate, needsBind, routeName]) => {
      if (bootstrapPending || activationGate) return

      const onBindRoute = routeName === SCANNER_EXAM_BIND_ROUTE

      if (needsBind && !onBindRoute) {
        router.replace({ name: SCANNER_EXAM_BIND_ROUTE })
      }
    },
    { immediate: true },
  )
}
