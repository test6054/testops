<template>
  <UiAlertStrip
    v-if="loadFailed"
    tone="warning"
    title="归档启用检查失败"
    description="无法确认当前租户的归档配置，请重试后再新建归档任务。"
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
    description="正在检查租户归档配置…"
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
    <p class="archive-setup-guide-banner__hint">
      可直接「新建归档任务」并选用平台母版；任务级协作、截止与材料清单请进入任务详情「任务设置」。
    </p>
    <template v-if="adminActionLinks.length > 0" #actions>
      <UiButton
        v-for="link in adminActionLinks"
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
import { ArchiveSetupActionLinkCode } from '@/types/enums/archive-setup-action-link-enum'

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

const missingItems = computed(() => props.readiness?.missingItems ?? [])

/** 列表页仅保留平台角色配置入口，不再引导教师进租户 settings 页 */
const adminActionLinks = computed(() =>
  (props.readiness?.actionLinks ?? []).filter(
    (link) => link.linkCode === ArchiveSetupActionLinkCode.ROLES,
  ),
)

function handleActionLink(linkTarget: string) {
  const normalized = linkTarget.trim()
  if (!normalized) return
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
  font-size: 14px;
  line-height: 1.5;
}

.archive-setup-guide-banner__hint {
  margin: var(--dp-space-2) 0 0;
  font-size: 14px;
  line-height: 1.5;
}
</style>
