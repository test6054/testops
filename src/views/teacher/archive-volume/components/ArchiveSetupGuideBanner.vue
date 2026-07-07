<template>
  <UiAlertStrip
    v-if="loading"
    tone="info"
    title="归档启用检查"
    description="正在检查租户归档配置是否就绪…"
    dense
    class="archive-setup-guide-banner"
  />
  <UiAlertStrip
    v-else-if="readiness && readiness.overallReady !== true"
    tone="warning"
    title="归档启用未完成"
    dense
    class="archive-setup-guide-banner"
  >
    <ul v-if="missingItems.length > 0" class="archive-setup-guide-banner__list">
      <li v-for="item in missingItems" :key="item">{{ item }}</li>
    </ul>
    <p v-else class="archive-setup-guide-banner__hint">
      请完成归档模块角色、模板集与学院责任人配置后再使用列表。
    </p>
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

defineOptions({ name: 'ArchiveSetupGuideBanner' })

const props = defineProps<{
  readiness: ArchiveTenantSetupReadinessResponse | null
  loading: boolean
}>()

const router = useRouter()

const missingItems = computed(() => props.readiness?.missingItems ?? [])
const actionLinks = computed(() => props.readiness?.actionLinks ?? [])

function handleActionLink(linkTarget: string) {
  const normalized = linkTarget.trim()
  if (!normalized) return
  if (normalized.startsWith('/teacher/archive-volumes/settings')) {
    const url = new URL(normalized, window.location.origin)
    const settingsTab = url.searchParams.get('tab') ?? 'duty'
    void router.push({
      path: '/teacher/archive-volumes/settings',
      query: {
        settingsTab,
      },
    })
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
  margin: var(--dp-space-2, 8px) 0 0;
  padding-left: 1.25em;
  font-size: 14px;
  line-height: 1.5;
}

.archive-setup-guide-banner__hint {
  margin: var(--dp-space-2, 8px) 0 0;
  font-size: 14px;
  line-height: 1.5;
}
</style>
