import type { Router } from 'vue-router'
import { showUserError } from '@/utils/error-handler'

/**
 * 考试工作台子页路由跳转：校验 routeName 合同并在缺失或未知路由时显式报错，禁止静默 no-op。
 */
export function navigateExamWorkspaceRoute(
  router: Router,
  routeName: string | undefined | null,
  params: Record<string, string>,
  contractLabel: string,
): void {
  const name = routeName?.trim()
  if (!name) {
    showUserError(null, `${contractLabel}缺少 routeName 合同字段`)
    return
  }
  if (!router.hasRoute(name)) {
    showUserError(null, `${contractLabel}路由未注册：${name}`)
    return
  }
  void router.push({ name, params })
}
