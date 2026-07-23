<template>
  <UiAlertStrip
    v-if="loadFailed"
    tone="warning"
    title="归档启用检查失败"
    description="无法确认当前租户的归档模板配置，请重试后再新建课程考核袋。"
    dense
    class="archive-setup-guide-banner"
  >
    <template #actions>
      <UiButton size="sm" variant="outline" @click="emit('retry')">重新检查</UiButton>
    </template>
  </UiAlertStrip>
  <UiAlertStrip
    v-else-if="loading"
    tone="info"
    title="归档启用检查"
    description="正在检查归档模板配置…"
    dense
    class="archive-setup-guide-banner"
  />
  <UiAlertStrip
    v-else-if="readiness && readiness.overallReady !== true"
    tone="info"
    title="归档启用提示"
    dense
    class="archive-setup-guide-banner"
  >
    <ul v-if="missingItems.length > 0" class="archive-setup-guide-banner__list">
      <li v-for="item in missingItems" :key="item">{{ item }}</li>
    </ul>
    <template v-if="actionLinks.length > 0" #actions>
      <UiButton
        v-for="link in actionLinks"
        :key="link.linkCode"
        size="sm"
        variant="outline"
        @click="handleActionLink(link.linkTarget)"
      >
        {{ link.linkName }}
      </UiButton>
    </template>
  </UiAlertStrip>
</template>

<script lang="ts" setup>
import type { ArchiveTenantSetupReadinessResponse } from '@/apis/mark/archive-platform-template'
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiAlertStrip from '@/components/ui-guide/ui/UiAlertStrip.vue'
import { useAuthStore } from '@/stores/modules/auth'
import { useUserStore } from '@/stores/modules/user'
import { RoleEnum } from '@/types/enums'

defineOptions({ name: 'ArchiveSetupGuideBanner' })

const props = defineProps<{
  readiness: ArchiveTenantSetupReadinessResponse | null
  loading: boolean
  loadFailed: boolean
}>()

const emit = defineEmits<{
  retry: []
}>()

const router = useRouter()
const authStore = useAuthStore()
const userStore = useUserStore()

/** MVR-246：配置深链仅超管/租户管理员可点，与 settings 路由 requireTenantAdmin 同源 */
const canManageArchiveConfig = computed(
  () => authStore.userRole === RoleEnum.SUPER_ADMIN || userStore.isTenantAdmin,
)

const missingItems = computed(() => props.readiness?.missingItems ?? [])
const actionLinks = computed(() => {
  if (!canManageArchiveConfig.value) {
    return []
  }
  return props.readiness?.actionLinks ?? []
})

function handleActionLink(linkTarget: string) {
  const normalized = linkTarget.trim()
  if (!normalized) return
  if (!canManageArchiveConfig.value) {
    return
  }
  if (normalized.startsWith('/')) {
    void router.push(normalized)
    return
  }
  window.location.assign(normalized)
}
</script>

<style scoped>
.archive-setup-guide-banner__list {
  margin: var(--dp-space-2) 0 0;
  padding-left: 1.25em;
  font-size: var(--dp-font-size-md);
  line-height: 1.5;
}
</style>
