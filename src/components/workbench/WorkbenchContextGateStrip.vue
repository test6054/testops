<script lang="ts" setup>
/**
 * 缺上下文 / 权限 / 未配置 B 钉条门禁：Tag + 说明 + 唯一 CTA，禁大 Empty 英雄区。
 * - listPath / listRouteName：导航返回（listRouteName 优先，examId 可选附加）
 * - fallbackRouteName：仅历史兼容默认值；有 listRouteName 时不再误用（MVR-247）
 * - 无导航时 emit('cta') 供页内动作（如新建数据源）
 * - hideCta：同页 Scope 已提供入口时仅展示状态钉条
 * 真无数据仍用紧凑 UiEmpty。
 */
import { useRoute, useRouter } from 'vue-router'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiTag from '@/components/ui-guide/ui/Tag.vue'
import UiAlertStrip from '@/components/ui-guide/ui/UiAlertStrip.vue'

defineOptions({ name: 'WorkbenchContextGateStrip' })

const props = withDefaults(
  defineProps<{
    /** 左侧状态 Tag */
    tag?: string
    /** 门禁说明 */
    body: string
    /** CTA 文案 */
    ctaLabel?: string
    /** 跳转 path（与 listRouteName 二选一） */
    listPath?: string
    /** 跳转路由 name */
    listRouteName?: string
    /** 无 examId 时回退路由 name */
    fallbackRouteName?: string
    /** 仅状态钉条，不展示 CTA（同页已有入口时） */
    hideCta?: boolean
    /** 条带色调 */
    tone?: 'info' | 'warning' | 'error'
  }>(),
  {
    tag: '缺少上下文',
    ctaLabel: '返回列表',
    listPath: undefined,
    listRouteName: undefined,
    fallbackRouteName: 'TeacherExamList',
    hideCta: false,
    tone: 'info',
  },
)

const emit = defineEmits<{
  cta: []
}>()

const router = useRouter()
const route = useRoute()


function onCta() {
  // MVR-247：listRouteName 有值时始终跳该路由；examId 仅作可选 params。
  // 无 examId 时不得误落到 fallback（默认 TeacherExamList），否则归档列表/配置 CTA 假导航。
  if (props.listRouteName) {
    const examId = route.params.examId
    if (typeof examId === 'string' && examId) {
      void router.push({ name: props.listRouteName, params: { examId } })
      return
    }
    void router.push({ name: props.listRouteName })
    return
  }
  if (props.listPath) {
    void router.push({ path: props.listPath })
    return
  }
  emit('cta')
}
</script>

<template>
  <UiAlertStrip
    :tone="tone"
    size="sm"
    dense
    inline
    :show-icon="false"
    class="workbench-context-gate-strip"
  >
    <template #default>
      <span class="workbench-context-gate-strip__row">
        <UiTag :tone="tone === 'warning' ? 'orange' : tone === 'error' ? 'red' : 'blue'" size="sm">
          {{ tag }}
        </UiTag>
        <span class="workbench-context-gate-strip__text">{{ body }}</span>
      </span>
    </template>
    <template v-if="!hideCta" #actions>
      <UiButton size="sm" variant="primary" @click="onCta">
        {{ ctaLabel }}
      </UiButton>
    </template>
  </UiAlertStrip>
</template>

<style scoped lang="scss">
.workbench-context-gate-strip {
  margin: var(--dp-space-2) 0;
  max-height: 48px;
  max-width: 100%;
}

.workbench-context-gate-strip__row {
  display: inline-flex;
  align-items: center;
  gap: var(--dp-space-2);
  min-width: 0;
}

.workbench-context-gate-strip__text {
  font-size: var(--dp-font-size-sm);
  color: var(--dp-text-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>
