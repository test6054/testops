<script setup lang="ts">
/**
 * §11.1 个人信息处理同意：首次 / 重新授权弹窗页。
 * 暂不授权仅保留说明，不进入档案采集主链。
 */
import type { PortfolioPrivacyConsentNoticeVO, PortfolioPrivacyConsentVO } from '@/apis/portfolio/privacy-consent'
import { message } from 'ant-design-vue'
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { portfolioPrivacyConsentApi } from '@/apis/portfolio/privacy-consent'
import UiCard from '@/components/ui-guide/ui/Card.vue'
import UiButton from '@/components/ui-guide/ui/UiButton.vue'
import ContextBar from '@/components/workbench/ContextBar.vue'
import StageWorkbenchShell from '@/components/workbench/StageWorkbenchShell.vue'
import { showUserError } from '@/utils/error-handler'

const route = useRoute()
const router = useRouter()

const loading = ref(false)
const submitting = ref(false)
const notice = ref<PortfolioPrivacyConsentNoticeVO | null>(null)
const state = ref<PortfolioPrivacyConsentVO | null>(null)

const teacherId = computed(() =>
  typeof route.query.teacherId === 'string' ? route.query.teacherId : undefined,
)
const blockedMode = computed(() => route.query.mode === 'blocked')
const errorMode = computed(() => route.query.mode === 'error')

async function load() {
  loading.value = true
  try {
    const [noticeResult, stateResult] = await Promise.all([
      portfolioPrivacyConsentApi.getNotice(),
      portfolioPrivacyConsentApi.getCurrent(teacherId.value ? { teacherId: teacherId.value } : undefined),
    ])
    notice.value = noticeResult
    state.value = stateResult
    if (stateResult.collectionAllowed) {
      await router.replace('/portfolio/teacher/home')
    }
  } catch (error) {
    showUserError(error, '加载失败')
  } finally {
    loading.value = false
  }
}

async function grant() {
  submitting.value = true
  try {
    state.value = await portfolioPrivacyConsentApi.grant(
      teacherId.value ? { teacherId: teacherId.value } : undefined,
    )
    message.success('已同意，可开始使用档案袋')
    await router.replace('/portfolio/teacher/home')
  } catch (error) {
    showUserError(error, '同意失败')
  } finally {
    submitting.value = false
  }
}

async function decline() {
  submitting.value = true
  try {
    state.value = await portfolioPrivacyConsentApi.decline(
      teacherId.value ? { teacherId: teacherId.value } : undefined,
    )
    message.info('已暂不授权')
  } catch (error) {
    showUserError(error, '暂不授权失败')
  } finally {
    submitting.value = false
  }
}

onMounted(load)
</script>

<template>
  <StageWorkbenchShell>
    <ContextBar title="个人信息处理同意" subtitle="进入档案袋前须确认数据采" />
    <UiCard title="教师数据采集与使用说明" style="margin-top: 16px">
      <p v-if="errorMode" class="privacy-consent__warn">
        同意状态暂不可用，请刷新后重试。在确认同意前不能进入档案采集。
      </p>
      <p v-else-if="blockedMode || state?.consentStatus === 'DECLINED' || state?.consentStatus === 'WITHDRAWN'" class="privacy-consent__warn">
        当前未授权数据采集。您可重新同意后进入档案袋；撤回或暂不授权不影响已依法归档的数据。
      </p>
      <p v-if="notice" class="privacy-consent__version">告知版本：{{ notice.policyVersion }}</p>
      <pre v-if="notice" class="privacy-consent__body">{{ notice.noticeMarkdown }}</pre>
      <p v-else-if="loading" class="privacy-consent__hint">正在加载告知文本…</p>
      <div class="privacy-consent__actions">
        <UiButton variant="primary" :loading="submitting" :disabled="loading" @click="grant">
          同意并继续
        </UiButton>
        <UiButton :loading="submitting" :disabled="loading" @click="decline">
          暂不授权
        </UiButton>
      </div>
    </UiCard>
  </StageWorkbenchShell>
</template>

<style scoped lang="scss">
.privacy-consent__warn {
  margin: 0 0 var(--dp-space-3);
  color: var(--dp-warning-text, #ad6800);
  font-size: 14px;
  line-height: 1.5;
}
.privacy-consent__version {
  margin: 0 0 var(--dp-space-2);
  color: var(--dp-text-secondary);
  font-size: 13px;
}
.privacy-consent__body {
  margin: 0 0 var(--dp-space-4);
  padding: var(--dp-space-3);
  max-height: 480px;
  overflow: auto;
  white-space: pre-wrap;
  font-size: 13px;
  line-height: 1.6;
  background: var(--dp-bg-muted);
  border-radius: 4px;
}
.privacy-consent__hint {
  margin: 0 0 var(--dp-space-3);
  color: var(--dp-text-secondary);
}
.privacy-consent__actions {
  display: flex;
  gap: var(--dp-space-2);
}
</style>
