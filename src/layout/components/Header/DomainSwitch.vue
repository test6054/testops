<script setup lang="ts">
/**
 * 阅卷中心 / 质量评价域切换：同一 SSO 下两条业务主链独立侧栏与默认 landing。
 */
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores'
import { RoleEnum } from '@/utils/permission'

defineOptions({ name: 'DomainSwitch' })

type AppDomain = 'marking' | 'quality'

const MARKING_DEFAULT = '/teacher/exam-list'
const QUALITY_DEFAULT = '/quality/dashboard'

const TEACHER_QUALITY_ROLES: RoleEnum[] = [
  RoleEnum.SCH_TECH,
  RoleEnum.CROP_ADMIN,
  RoleEnum.CROP_USER,
  RoleEnum.SUPER_ADMIN,
]

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()

const visible = computed(() => TEACHER_QUALITY_ROLES.includes(authStore.userRole as RoleEnum))

const activeDomain = computed<AppDomain>(() => {
  if (route.path.startsWith('/quality')) {
    return 'quality'
  }
  if (route.path.startsWith('/teacher')) {
    return 'marking'
  }
  return 'marking'
})

function switchDomain(domain: AppDomain) {
  if (domain === activeDomain.value) {
    return
  }
  void router.push(domain === 'quality' ? QUALITY_DEFAULT : MARKING_DEFAULT)
}
</script>

<template>
  <div v-if="visible" class="domain-switch" role="tablist" aria-label="业务域切换">
    <button
      type="button"
      class="domain-switch__btn"
      :class="{ 'domain-switch__btn--active': activeDomain === 'marking' }"
      role="tab"
      :aria-selected="activeDomain === 'marking'"
      @click="switchDomain('marking')"
    >
      阅卷中心
    </button>
    <button
      type="button"
      class="domain-switch__btn"
      :class="{ 'domain-switch__btn--active': activeDomain === 'quality' }"
      role="tab"
      :aria-selected="activeDomain === 'quality'"
      @click="switchDomain('quality')"
    >
      质量评价
    </button>
  </div>
</template>

<style lang="scss" scoped>
.domain-switch {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  padding: 2px;
  margin-right: var(--dp-space-4, 16px);
  border-radius: var(--dp-radius-control, 6px);
  background: var(--ant-color-fill-quaternary);
  flex-shrink: 0;
}

.domain-switch__btn {
  border: none;
  background: transparent;
  padding: 4px 12px;
  font-size: var(--dp-font-size-sm, 13px);
  font-weight: var(--dp-font-weight-title, 600);
  color: var(--dp-text-secondary, #64748b);
  border-radius: var(--dp-radius-control, 6px);
  cursor: pointer;
  transition: background var(--dp-duration-fast, 150ms) ease, color var(--dp-duration-fast, 150ms) ease;

  &:hover {
    color: var(--dp-text-primary, #0f172a);
  }

  &--active {
    background: var(--ant-color-bg-container);
    color: var(--ant-color-primary);
    box-shadow: var(--dp-shadow-xs);
  }
}
</style>
