<script setup lang="ts">
/**
 * §11.1 个人信息处理同意：首次 / 重新授权弹窗页。
 * 暂不授权仅保留说明，不进入档案采集主链。
 */
import type {
  PortfolioPrivacyConsentNoticeVO,
  PortfolioPrivacyConsentVO,
} from '@/apis/portfolio/privacy-consent'
import { portfolioPrivacyConsentApi } from '@/apis/portfolio/privacy-consent'
import { message } from 'ant-design-vue'
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import UiCard from '@/components/ui-guide/ui/Card.vue'
import UiButton from '@/components/ui-guide/ui/UiButton.vue'
import ContextBar from '@/components/workbench/ContextBar.vue'
import StageWorkbenchShell from '@/components/workbench/StageWorkbenchShell.vue'
import { confirmAsync } from '@/composables/useConfirmDialog'
import { showUserError } from '@/utils/error-handler'

const route = useRoute()
const router = useRouter()

const loading = ref(false)
const submitting = ref(false)
const loadError = ref(false)
const requestToken = ref(0)
const notice = ref<PortfolioPrivacyConsentNoticeVO | null>(null)
const state = ref<PortfolioPrivacyConsentVO | null>(null)

const teacherId = computed(() =>
  typeof route.query.teacherId === 'string' ? route.query.teacherId : undefined,
)
const blockedMode = computed(() => route.query.mode === 'blocked')
const errorMode = computed(() => route.query.mode === 'error')
const manageMode = computed(() => route.query.mode === 'manage')
const actionDisabled = computed(
  () => loading.value || loadError.value || !notice.value || !state.value,
)

async function load() {
  const currentToken = requestToken.value + 1
  requestToken.value = currentToken
  loading.value = true
  loadError.value = false
  notice.value = null
  state.value = null
  try {
    const [noticeResult, stateResult] = await Promise.all([
      portfolioPrivacyConsentApi.getNotice(),
      portfolioPrivacyConsentApi.getCurrent(
        teacherId.value ? { teacherId: teacherId.value } : undefined,
      ),
    ])
    if (requestToken.value !== currentToken) return
    notice.value = noticeResult
    state.value = stateResult
    if (stateResult.collectionAllowed && !manageMode.value) {
      await router.replace('/portfolio/teacher/home')
    }
  } catch (error) {
    if (requestToken.value !== currentToken) return
    loadError.value = true
    showUserError(error, '加载个人信息处理状态失败')
  } finally {
    if (requestToken.value === currentToken) loading.value = false
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

async function withdraw() {
  const confirmed = await confirmAsync({
    title: '确认撤回个人信息处理同意？',
    content: '撤回后将立即停止新增材料采集和档案写入；已依法形成的正式档案仍按制度保留。',
    type: 'warning',
  })
  if (!confirmed) return

  const targetTeacherId = teacherId.value
  submitting.value = true
  try {
    state.value = await portfolioPrivacyConsentApi.withdraw(
      targetTeacherId ? { teacherId: targetTeacherId } : undefined,
    )
    message.success('已撤回同意，新增采集已停止')
  } catch (error) {
    showUserError(error, '撤回同意失败')
  } finally {
    submitting.value = false
  }
}

function goHome() {
  void router.push({
    path: '/portfolio/teacher/home',
    query: teacherId.value ? { teacherId: teacherId.value } : {},
  })
}

watch(
  () => [route.query.teacherId, route.query.mode],
  () => {
    void load()
  },
  { immediate: true },
)
</script>

<template>
  <StageWorkbenchShell>
    <ContextBar title="个人信息处理同意" subtitle="管理教师数据采集与使用授权" />
    <UiCard title="教师数据采集与使用说明" style="margin-top: 16px">
      <p v-if="errorMode" class="privacy-consent__warn">
        同意状态暂不可用，请刷新后重试。在确认同意前不能进入档案采集。
      </p>
      <p
        v-else-if="
          blockedMode || state?.consentStatus === 'DECLINED' || state?.consentStatus === 'WITHDRAWN'
        "
        class="privacy-consent__warn"
      >
        当前未授权数据采集。您可重新同意后进入档案袋；撤回或暂不授权不影响已依法归档的数据。
      </p>
      <p v-if="notice" class="privacy-consent__version">告知版本：{{ notice.policyVersion }}</p>
      <pre v-if="notice" class="privacy-consent__body">{{ notice.noticeMarkdown }}</pre>
      <p v-else-if="loading" class="privacy-consent__hint">正在加载告知文本…</p>
      <p v-else-if="loadError" class="privacy-consent__warn">
        告知文本或同意状态加载失败，不能执行授权操作。
      </p>
      <div class="privacy-consent__actions">
        <template v-if="state?.collectionAllowed">
          <UiButton
            variant="outline"
            status="danger"
            :loading="submitting"
            :disabled="actionDisabled"
            @click="withdraw"
          >
            撤回同意
          </UiButton>
          <UiButton variant="outline" :disabled="submitting" @click="goHome">返回首页</UiButton>
        </template>
        <template v-else>
          <UiButton
            variant="primary"
            :loading="submitting"
            :disabled="actionDisabled"
            @click="grant"
          >
            同意并继续
          </UiButton>
          <UiButton :loading="submitting" :disabled="actionDisabled" @click="decline">
            暂不授权
          </UiButton>
        </template>
        <UiButton v-if="loadError" variant="outline" :loading="loading" @click="() => load()"
          >重试</UiButton
        >
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
