<script setup lang="ts">
import type { AccreditationCockpitVO } from '@/apis/quality/accreditation'
/**
 * 质量评价域 Layout 级上下文：培养方案范围 + 认证阶段提示。
 * 仅在质量评价 /quality 路由下加载认证驾驶舱；教学档案袋 /portfolio 与阅卷页不触发。
 */
import { computed, onMounted, provide, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { accreditationApi } from '@/apis/quality/accreditation'
import AccreditationPhaseBanner from '@/components/quality/AccreditationPhaseBanner.vue'
import QualityScopeHeader from '@/components/quality/QualityScopeHeader.vue'
import {
  accreditationPhaseContextKey,
  qualityLayoutScopeProvidedKey,
} from '@/composables/quality-layout-context'
import { useQualityStore } from '@/stores/modules/quality'
import { showUserError } from '@/utils/error-handler'
import { isQualityEvaluationRoute } from '@/utils/portfolio-route'

defineOptions({ name: 'QualityLayoutContext' })

const route = useRoute()
const qualityStore = useQualityStore()

const layoutScopeProvided = ref(true)
provide(qualityLayoutScopeProvidedKey, layoutScopeProvided)

const visible = computed(() => isQualityEvaluationRoute(route.path))

const cockpit = ref<AccreditationCockpitVO>()
const cockpitLoading = ref(false)

async function reloadCockpit() {
  if (!visible.value) {
    return
  }
  const planId = qualityStore.currentTrainingPlanId
  if (!planId) {
    cockpit.value = undefined
    return
  }
  cockpitLoading.value = true
  try {
    cockpit.value = await accreditationApi.cockpit(planId)
  } catch (error) {
    showUserError(error, '认证驾驶舱指标加载失败')
    cockpit.value = undefined
  } finally {
    cockpitLoading.value = false
  }
}

provide(accreditationPhaseContextKey, {
  cockpit,
  loading: cockpitLoading,
  reload: reloadCockpit,
})

function handleScopeChange() {
  void reloadCockpit()
}

watch(visible, (isVisible) => {
  if (!isVisible) {
    cockpit.value = undefined
    cockpitLoading.value = false
    return
  }
  void reloadCockpit()
})

watch(
  () => qualityStore.currentTrainingPlanId,
  () => {
    if (!visible.value) {
      return
    }
    void reloadCockpit()
  },
)

onMounted(() => {
  if (visible.value) {
    void reloadCockpit()
  }
})
</script>

<template>
  <div v-if="visible" class="quality-layout-context">
    <div class="quality-layout-context__scope">
      <QualityScopeHeader show-plan-confirmation @change="handleScopeChange" />
    </div>
    <AccreditationPhaseBanner
      :cockpit="cockpit"
      :loading="cockpitLoading"
      @refresh="reloadCockpit"
    />
  </div>
</template>

<style lang="scss" scoped>
.quality-layout-context {
  padding: var(--dp-space-4, 16px) 24px 0;
  background: var(--ant-color-bg-container);
  border-bottom: 1px solid var(--ant-color-border-secondary);
}

.quality-layout-context__scope {
  margin-bottom: var(--dp-space-3, 12px);
}
</style>
