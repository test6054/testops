<script setup lang="ts">
/**
 * §11.1 个人信息处理同意：首次 / 重新授权弹窗页。
 * 暂不授权仅保留说明，不进入档案采集主链。
 */
import type {
  PortfolioPrivacyConsentNoticeVO,
  PortfolioPrivacyConsentVO,
} from '@/apis/portfolio/privacy-consent'
import message from 'ant-design-vue/es/message'
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { portfolioPrivacyConsentApi } from '@/apis/portfolio/privacy-consent'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiCard from '@/components/ui-guide/ui/Card.vue'
import UiAlertStrip from '@/components/ui-guide/ui/UiAlertStrip.vue'
import ContextBar from '@/components/workbench/ContextBar.vue'
import StageWorkbenchShell from '@/components/workbench/StageWorkbenchShell.vue'
import { confirmAsync } from '@/composables/useConfirmDialog'
import { usePortfolioTeacherAccess } from '@/composables/usePortfolioTeacherAccess'
import { PortfolioPrivacyConsentStatusCode } from '@/types/enums/portfolio-privacy-consent-status-enum'
import { showUserError } from '@/utils/error-handler'
import PortfolioOwnerIdentityLayersCell from '@/views/portfolio/components/PortfolioOwnerIdentityLayersCell.vue'

const route = useRoute()
const router = useRouter()
const { currentUserId } = usePortfolioTeacherAccess()

const loading = ref(false)
const submitting = ref(false)
const stateLoadError = ref(false)
const noticeLoadError = ref(false)
const noticeStale = ref(false)
const stateStale = ref(false)
const requestToken = ref(0)
const pageGeneration = ref(0)
const notice = ref<PortfolioPrivacyConsentNoticeVO | null>(null)
const state = ref<PortfolioPrivacyConsentVO | null>(null)

const teacherId = computed(() =>
  typeof route.query.teacherId === 'string' ? route.query.teacherId : undefined,
)
const blockedMode = computed(() => route.query.mode === 'blocked')
const errorMode = computed(() => route.query.mode === 'error')
const manageMode = computed(() => route.query.mode === 'manage')
const loadError = computed(() => stateLoadError.value || noticeLoadError.value)
const actionDisabled = computed(
  () => loading.value || loadError.value || !notice.value || !state.value,
)

/** 隐私授权仅本人可签；代办不可代签同意/撤回 */
const isProxyPrivacyTarget = computed(() => {
  if (!teacherId.value || !currentUserId.value) {
    return false
  }
  return teacherId.value !== currentUserId.value
})

const privacyWriteBlocked = computed(() => isProxyPrivacyTarget.value)

function buildActionPayload(boundTeacherId: string | undefined, boundPolicyVersion: string) {
  return {
    ...(boundTeacherId ? { teacherId: boundTeacherId } : {}),
    policyVersion: boundPolicyVersion,
  }
}

async function load() {
  const currentToken = ++requestToken.value
  const boundTeacherId = teacherId.value
  loading.value = true
  stateLoadError.value = false
  noticeLoadError.value = false
  try {
    const stateResult = await portfolioPrivacyConsentApi.getCurrent(
      boundTeacherId ? { teacherId: boundTeacherId } : undefined,
    )
    if (
      requestToken.value !== currentToken
      || teacherId.value !== boundTeacherId
    ) {
      return
    }
    state.value = stateResult
    stateStale.value = false
    try {
      const noticeResult = await portfolioPrivacyConsentApi.getNotice()
      if (
        requestToken.value !== currentToken
        || teacherId.value !== boundTeacherId
      ) {
        return
      }
      notice.value = noticeResult
      noticeStale.value = false
      noticeLoadError.value = false
    } catch (error) {
      if (
        requestToken.value !== currentToken
        || teacherId.value !== boundTeacherId
      ) {
        return
      }
      noticeLoadError.value = true
      if (notice.value) {
        noticeStale.value = true
      } else {
        notice.value = null
      }
      showUserError(error, '加载个人信息处理告知失败')
    }
    if (
      stateResult.collectionAllowed
      && !manageMode.value
      && requestToken.value === currentToken
      && teacherId.value === boundTeacherId
    ) {
      await router.replace('/portfolio/teacher/home')
    }
  } catch (error) {
    if (
      requestToken.value !== currentToken
      || teacherId.value !== boundTeacherId
    ) {
      return
    }
    stateLoadError.value = true
    if (state.value) {
      stateStale.value = true
    } else {
      state.value = null
    }
    if (!notice.value) {
      noticeLoadError.value = true
    }
    showUserError(error, '加载个人信息处理状态失败')
  } finally {
    if (requestToken.value === currentToken) loading.value = false
  }
}

async function grant() {
  if (privacyWriteBlocked.value) {
    void message.warning('不可代他人签署个人信息处理同意')
    return
  }
  const boundTeacherId = teacherId.value
  const boundPolicyVersion = notice.value?.policyVersion
  const boundGeneration = pageGeneration.value
  if (!boundPolicyVersion) {
    showUserError(null, '告知文本未就绪，不能签署')
    return
  }
  submitting.value = true
  try {
    const nextState = await portfolioPrivacyConsentApi.grant(
      buildActionPayload(boundTeacherId, boundPolicyVersion),
    )
    if (
      pageGeneration.value !== boundGeneration
      || teacherId.value !== boundTeacherId
    ) {
      return
    }
    state.value = nextState
    void message.success('已同意，可开始使用档案袋')
    await router.replace('/portfolio/teacher/home')
  } catch (error) {
    if (
      pageGeneration.value !== boundGeneration
      || teacherId.value !== boundTeacherId
    ) {
      return
    }
    showUserError(error, '同意失败')
  } finally {
    submitting.value = false
  }
}

async function decline() {
  if (privacyWriteBlocked.value) {
    void message.warning('不可代他人暂不授权')
    return
  }
  const boundTeacherId = teacherId.value
  const boundPolicyVersion = notice.value?.policyVersion
  const boundGeneration = pageGeneration.value
  if (!boundPolicyVersion) {
    showUserError(null, '告知文本未就绪，不能操作')
    return
  }
  submitting.value = true
  try {
    const nextState = await portfolioPrivacyConsentApi.decline(
      buildActionPayload(boundTeacherId, boundPolicyVersion),
    )
    if (
      pageGeneration.value !== boundGeneration
      || teacherId.value !== boundTeacherId
    ) {
      return
    }
    state.value = nextState
    void message.info('已暂不授权')
  } catch (error) {
    if (
      pageGeneration.value !== boundGeneration
      || teacherId.value !== boundTeacherId
    ) {
      return
    }
    showUserError(error, '暂不授权失败')
  } finally {
    submitting.value = false
  }
}

async function withdraw() {
  if (privacyWriteBlocked.value) {
    void message.warning('不可代他人撤回个人信息处理同意')
    return
  }

  const confirmed = await confirmAsync({
    title: '确认撤回个人信息处理同意？',
    content: '撤回后将立即停止新增材料采集和档案写入；已依法形成的正式档案仍按制度保留。',
    type: 'warning',
  })
  if (!confirmed) return

  const boundTeacherId = teacherId.value
  const boundPolicyVersion = notice.value?.policyVersion || state.value?.currentPolicyVersion
  const boundGeneration = pageGeneration.value
  if (!boundPolicyVersion) {
    showUserError(null, '告知版本未知，不能撤回')
    return
  }
  submitting.value = true
  try {
    const nextState = await portfolioPrivacyConsentApi.withdraw(
      buildActionPayload(boundTeacherId, boundPolicyVersion),
    )
    if (
      pageGeneration.value !== boundGeneration
      || teacherId.value !== boundTeacherId
    ) {
      return
    }
    state.value = nextState
    void message.success('已撤回同意，新增采集已停止')
  } catch (error) {
    if (
      pageGeneration.value !== boundGeneration
      || teacherId.value !== boundTeacherId
    ) {
      return
    }
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
    pageGeneration.value += 1
    void load()
  },
  { immediate: true },
)
</script>

<template>
  <StageWorkbenchShell>
    <template #context>
      <ContextBar
        layout="workbench"
        show-title
        title="个人信息处理同意"
        subtitle="管理教师数据采集与使用授权"
      >
        <template #actions>
          <UiButton size="sm" variant="outline" :loading="loading" @click="load">刷新</UiButton>
        </template>
      </ContextBar>
    </template>
    <div v-if="isProxyPrivacyTarget" class="privacy-consent__proxy-gate" role="status">
      <span class="privacy-consent__proxy-text">
        当前为目标教师范围：隐私授权仅本人可签，管理员不可代签同意或撤回。
      </span>
      <UiButton size="sm" variant="outline" @click="goHome">返回工作台</UiButton>
    </div>
    <div v-if="state?.ownerIdentityLayers?.length" class="privacy-consent__identity" role="status">
      <span class="privacy-consent__identity-label">当前身份层</span>
      <PortfolioOwnerIdentityLayersCell
        :layers="state.ownerIdentityLayers"
        :note="state.ownerMultiIdentityNote"
        show-note
      />
    </div>
    <UiCard title="教师数据采集与使用说明" style="margin-top: var(--dp-space-block)">
      <UiAlertStrip
        v-if="noticeStale || stateStale"
        tone="warning"
        class="privacy-consent__stale"
        title="同步失败"
      />
      <p v-if="errorMode" class="privacy-consent__warn">
        同意状态暂不可用。在确认同意前不能进入档案采集。
      </p>
      <p
        v-else-if="
          blockedMode || state?.consentStatus === PortfolioPrivacyConsentStatusCode.DECLINED || state?.consentStatus === PortfolioPrivacyConsentStatusCode.WITHDRAWN
        "
        class="privacy-consent__warn"
      >
        当前未授权数据采集。您可重新同意后进入档案袋；撤回或暂不授权不影响已依法归档的数据。
      </p>
      <p v-if="notice" class="privacy-consent__version">告知版本：{{ notice.policyVersion }}</p>
      <pre v-if="notice" class="privacy-consent__body">{{ notice.noticeMarkdown }}</pre>
      <p v-else-if="loading" class="privacy-consent__hint">正在加载告知文本…</p>
      <p v-else-if="loadError && !notice" class="privacy-consent__warn">
        告知文本或同意状态加载失败，不能执行授权操作。
      </p>
      <div v-if="!privacyWriteBlocked" class="privacy-consent__actions">
        <template v-if="state?.collectionAllowed">
          <UiButton
            size="sm"
            variant="outline"
            status="danger"
            :loading="submitting"
            :disabled="actionDisabled || privacyWriteBlocked"
            @click="withdraw"
          >
            撤回同意
          </UiButton>
          <UiButton size="sm" variant="outline" :disabled="submitting" @click="goHome">
            返回首页
          </UiButton>
        </template>
        <template v-else>
          <UiButton
            size="sm"
            variant="primary"
            :loading="submitting"
            :disabled="actionDisabled || privacyWriteBlocked"
            @click="grant"
          >
            同意并继续
          </UiButton>
          <UiButton
            size="sm"
            variant="outline"
            :loading="submitting"
            :disabled="actionDisabled || privacyWriteBlocked"
            @click="decline"
          >
            暂不授权
          </UiButton>
        </template>
      </div>
    </UiCard>
  </StageWorkbenchShell>
</template>

<style scoped>
.privacy-consent__proxy-gate {
  display: flex;
  flex-wrap: wrap;
  gap: var(--dp-space-component-tight);
  align-items: center;
  margin-top: var(--dp-space-block);
  padding: var(--dp-space-component-tight) var(--dp-space-component);
  border: 1px solid var(--dp-border);
  border-radius: var(--dp-radius-xs);
  background: var(--dp-fill-quaternary);
}
.privacy-consent__proxy-text {
  flex: 1;
  min-width: 200px;
  font-size: var(--dp-font-size-sm);
  color: var(--dp-text-secondary);
}
.privacy-consent__identity {
  display: flex;
  flex-wrap: wrap;
  gap: var(--dp-space-component-tight);
  align-items: flex-start;
  margin-top: var(--dp-space-component);
}
.privacy-consent__identity-label {
  font-size: var(--dp-font-size-sm);
  color: var(--dp-text-secondary);
}
.privacy-consent__stale {
  margin-bottom: var(--dp-space-component);
}
.privacy-consent__warn {
  margin: 0 0 var(--dp-space-component);
  color: var(--dp-warning, #d48806);
  font-size: var(--dp-font-size-sm);
}
.privacy-consent__version {
  margin: 0 0 var(--dp-space-component-tight);
  font-size: var(--dp-font-size-sm);
  color: var(--dp-text-secondary);
}
.privacy-consent__body {
  margin: 0 0 var(--dp-space-block);
  padding: var(--dp-space-component);
  max-height: 360px;
  overflow: auto;
  white-space: pre-wrap;
  word-break: break-word;
  background: var(--dp-fill-quaternary);
  border-radius: var(--dp-radius-xs);
  font-size: var(--dp-font-size-sm);
}
.privacy-consent__hint {
  margin: 0 0 var(--dp-space-component);
  font-size: var(--dp-font-size-sm);
  color: var(--dp-text-secondary);
}
.privacy-consent__actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--dp-space-component-tight);
}
</style>
