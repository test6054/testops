<template>
  <div class="cas-login-container">
    <UiStateBlock
      v-if="isProcessingCallback"
      state="loading"
      title="正在验证统一认证登录..."
      compact
    />

    <div v-else class="cas-login-content">
      <UiFormField v-if="!subdomainMode" label="学校" required :error="schoolError">
        <UiSelect
          v-model="selectedTenantId"
          :options="tenantOptions"
          placeholder="请输入学校名称"
          allow-clear
          allow-search
          :filter-option="false"
          size="lg"
          :loading="tenantListLoading"
          @search="handleTenantSearch"
        />
      </UiFormField>

      <div v-if="subdomainMode && subdomainTenant" class="cas-school-fixed">
        <span class="cas-school-fixed__label">学校</span>
        <span class="cas-school-fixed__name">{{ subdomainTenant.tenantName }}</span>
      </div>

      <UiStateBlock
        v-if="tenantListLoadFailed"
        state="error"
        title="学校列表加载失败"
        description="请检查网络后重试"
        compact
      >
        <template #actions>
          <UiButton
            variant="secondary"
            size="sm"
            :loading="tenantListLoading"
            @click="retryTenantList"
          >
            重试
          </UiButton>
        </template>
      </UiStateBlock>

      <UiStateBlock
        v-else-if="configLoading"
        state="loading"
        title="正在查询学校统一认证配置..."
        compact
      />

      <div v-else-if="configLoadFailed && selectedTenantId" class="cas-load-failed">
        <p>{{ errorMessage || '查询学校统一认证配置失败' }}</p>
        <UiButton variant="secondary" size="sm" :loading="configLoading" @click="retrySsoConfig">
          重试
        </UiButton>
      </div>

      <template v-else-if="resolvedTenantId">
        <div v-if="casEnabled" class="cas-description">
          <div class="cas-icon" aria-hidden="true">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="1.5"
              stroke-linecap="round"
              stroke-linejoin="round"
              width="48"
              height="48"
            >
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
          </div>
          <h3>{{ displayName }}</h3>
          <p>使用学校统一身份认证系统登录</p>

          <UiButton variant="primary" size="lg" block :loading="loading" @click="handleCasLogin">
            {{ loading ? '正在跳转...' : `${displayName}登录` }}
          </UiButton>

          <div class="cas-tips">
            <p>点击按钮后将跳转到学校统一认证页面</p>
            <p>使用学校账号完成登录后自动返回</p>
            <p>首次登录若信息不足，会进入补录后继续登录</p>
          </div>
        </div>

        <div v-else class="cas-disabled">
          <p>该学校尚未开通统一身份认证</p>
          <p class="cas-disabled__hint">请改用账号登录或学号登录</p>
        </div>
      </template>

      <div v-else-if="!subdomainMode && !selectedTenantId" class="cas-hint">
        请先选择学校，再使用统一身份认证登录
      </div>
    </div>

    <div v-if="errorMessage && !configLoadFailed && !tenantListLoadFailed" class="cas-error">
      <svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16">
        <path
          fill-rule="evenodd"
          d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
          clip-rule="evenodd"
        />
      </svg>
      <span>{{ errorMessage }}</span>
      <button type="button" class="cas-error__close" @click="errorMessage = ''">×</button>
    </div>
  </div>
</template>

<script lang="ts" setup>
import type { TenantPublicInfo } from '@/apis/auth'
import message from 'ant-design-vue/es/message'
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getTenantList } from '@/apis/auth'
import {
  casCallback,
  getCasLoginUrl,
  getSsoConfig,
  isCasProfileCompletionResponse,
} from '@/apis/sso'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiFormField from '@/components/ui-guide/ui/UiFormField.vue'
import UiSelect from '@/components/ui-guide/ui/UiSelect.vue'
import UiStateBlock from '@/components/ui-guide/ui/UiStateBlock.vue'
import { STORAGE_LAST_STUDENT_SCHOOL } from '@/constants/storage-keys'
import { getDefaultRoute } from '@/router/permission'
import { useAuthStore, useUserStore } from '@/stores'
import { getUserErrorMessage, showUserError } from '@/utils/error-handler'
import { shouldEnforcePasswordChange } from '@/utils/password-change-enforcement'

defineOptions({ name: 'CasLogin' })

const props = withDefaults(
  defineProps<{
    subdomainMode?: boolean
    subdomainTenant?: TenantPublicInfo | null
    tenantId?: string
  }>(),
  {
    subdomainMode: false,
    subdomainTenant: null,
    tenantId: '',
  },
)

const emit = defineEmits<{
  (e: 'tenant-ready', payload: { tenantId: string, casEnabled: boolean, displayName: string }): void
  (e: 'login-success'): void
  (e: 'login-error', error: string): void
}>()

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()
const authStore = useAuthStore()

const loading = ref(false)
const configLoading = ref(false)
const tenantListLoading = ref(false)
const isProcessingCallback = ref(false)
const errorMessage = ref('')
const schoolError = ref('')
const selectedTenantId = ref('')
const tenantSearch = ref('')
const resolvedTenantId = ref('')
const casEnabled = ref(false)
const casDisplayName = ref('统一认证')
const tenantCache = ref<TenantPublicInfo[]>([])
const configLoadFailed = ref(false)
const tenantListLoadFailed = ref(false)

const displayName = computed(() => casDisplayName.value || '统一认证')

const tenantOptions = computed(() => {
  const keyword = tenantSearch.value.trim().toLowerCase()
  const rows: { value: string, label: string }[] = []
  for (const item of tenantCache.value) {
    const name = item.tenantName || ''
    const code = item.tenantCode || ''
    if (!keyword || name.toLowerCase().includes(keyword) || code.toLowerCase().includes(keyword)) {
      rows.push({
        value: item.tenantId,
        label: code ? `${name}（${code}）` : name,
      })
    }
    if (rows.length >= 50) {
      break
    }
  }
  return rows
})

async function ensureTenantCache(force = false): Promise<TenantPublicInfo[]> {
  if (!force && tenantCache.value.length > 0) {
    tenantListLoadFailed.value = false
    return tenantCache.value
  }
  tenantListLoading.value = true
  tenantListLoadFailed.value = false
  try {
    const list = await getTenantList()
    tenantCache.value = list || []
    return tenantCache.value
  } catch (error: unknown) {
    tenantListLoadFailed.value = true
    errorMessage.value = getUserErrorMessage(error, '学校列表加载失败')
    return tenantCache.value
  } finally {
    tenantListLoading.value = false
  }
}

async function retryTenantList() {
  errorMessage.value = ''
  await ensureTenantCache(true)
}

function findTenant(tenantId: string): TenantPublicInfo | undefined {
  return tenantCache.value.find((item) => item.tenantId === tenantId)
}

async function loadSsoForTenant(tenantId: string) {
  if (!tenantId) {
    resolvedTenantId.value = ''
    casEnabled.value = false
    casDisplayName.value = '统一认证'
    configLoadFailed.value = false
    return
  }

  configLoading.value = true
  configLoadFailed.value = false
  errorMessage.value = ''
  schoolError.value = ''
  selectedTenantId.value = tenantId
  try {
    const config = await getSsoConfig(tenantId)
    resolvedTenantId.value = tenantId
    casEnabled.value = Boolean(config.enabled)
    casDisplayName.value = config.casDisplayName || '统一认证'
    const tenant = findTenant(tenantId)
    if (tenant?.tenantName) {
      localStorage.setItem(STORAGE_LAST_STUDENT_SCHOOL, tenant.tenantName)
    }
    emit('tenant-ready', {
      tenantId,
      casEnabled: Boolean(config.enabled),
      displayName: casDisplayName.value,
    })
  } catch (error: unknown) {
    resolvedTenantId.value = ''
    casEnabled.value = false
    configLoadFailed.value = true
    errorMessage.value = getUserErrorMessage(error, '查询学校统一认证配置失败')
  } finally {
    configLoading.value = false
  }
}

async function retrySsoConfig() {
  if (!selectedTenantId.value) {
    return
  }
  await loadSsoForTenant(String(selectedTenantId.value))
}

const handleTenantSearch = (keyword: string) => {
  tenantSearch.value = keyword
}

const handleSchoolClear = () => {
  schoolError.value = ''
  errorMessage.value = ''
  selectedTenantId.value = ''
  resolvedTenantId.value = ''
  casEnabled.value = false
  casDisplayName.value = '统一认证'
  tenantSearch.value = ''
  configLoadFailed.value = false
}

watch(selectedTenantId, async (tenantId, prev) => {
  if (props.subdomainMode) {
    return
  }
  if (!tenantId) {
    if (prev) {
      handleSchoolClear()
    }
    return
  }
  if (tenantId === resolvedTenantId.value && !configLoading.value && !configLoadFailed.value) {
    return
  }
  await loadSsoForTenant(String(tenantId))
})

const handleCasLogin = async () => {
  schoolError.value = ''
  errorMessage.value = ''

  if (!resolvedTenantId.value && selectedTenantId.value) {
    await loadSsoForTenant(String(selectedTenantId.value))
  }

  if (configLoadFailed.value) {
    return
  }
  if (!resolvedTenantId.value) {
    schoolError.value = '请先选择学校'
    message.error('请先选择学校')
    return
  }
  if (!casEnabled.value) {
    message.error('该学校尚未开通统一身份认证')
    return
  }

  loading.value = true
  try {
    const loginUrl = await getCasLoginUrl(resolvedTenantId.value)
    if (!loginUrl) {
      const msg = '统一认证暂不可用，请改用账号登录或学号登录'
      errorMessage.value = msg
      emit('login-error', msg)
      return
    }
    window.location.href = loginUrl
  } catch (error: unknown) {
    const msg = getUserErrorMessage(error, '获取统一认证登录地址失败')
    errorMessage.value = msg
    emit('login-error', msg)
  } finally {
    loading.value = false
  }
}

const handleCasCallback = async (ticket: string, tenantId: string) => {
  isProcessingCallback.value = true
  errorMessage.value = ''
  try {
    const result = await casCallback(ticket, tenantId)
    const cleanUrl = new URL(window.location.href)
    cleanUrl.searchParams.delete('ticket')
    cleanUrl.searchParams.delete('from')
    cleanUrl.searchParams.delete('tenantId')
    window.history.replaceState({}, '', cleanUrl.pathname)

    if (isCasProfileCompletionResponse(result)) {
      await router.push({
        path: '/cas-first-login-completion',
        query: { completionToken: result.completionToken },
      })
      return
    }

    authStore.setTokenWithExpiry(result.accessToken, result.expiresIn)
    if (result.refreshToken) {
      authStore.setRefreshToken(result.refreshToken)
    }
    await userStore.getInfo(true)

    if (result.tenantInfo) {
      userStore.userInfo.tenantId = result.tenantInfo.id
      userStore.userInfo.tenantName = result.tenantInfo.tenantName
    }

    if (shouldEnforcePasswordChange(userStore.userInfo)) {
      message.warning('出于安全考虑，您需要修改密码后才能继续使用系统')
      await router.push('/change-password')
      return
    }

    await router.push(getDefaultRoute(authStore.userRole))
    message.success('统一认证登录成功')
    emit('login-success')
  } catch (error: unknown) {
    const msg = getUserErrorMessage(error, '统一认证登录失败，请重试')
    errorMessage.value = msg
    showUserError(error, '统一认证登录失败，请重试')
    emit('login-error', msg)
  } finally {
    isProcessingCallback.value = false
  }
}

function queryString(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

const checkCasCallback = (): boolean => {
  const ticket = queryString(route.query.ticket)
  const from = queryString(route.query.from)
  const tenantId = queryString(route.query.tenantId) || props.tenantId || resolvedTenantId.value
  if (ticket && (from === 'cas' || tenantId)) {
    handleCasCallback(ticket, tenantId)
    return true
  }
  return false
}

watch(
  () => props.subdomainTenant,
  async (tenant) => {
    if (props.subdomainMode && tenant?.tenantId) {
      await ensureTenantCache()
      await loadSsoForTenant(tenant.tenantId)
    }
  },
  { immediate: true },
)

watch(
  () => props.tenantId,
  async (id) => {
    if (props.subdomainMode || !id) {
      return
    }
    if (queryString(route.query.ticket)) {
      resolvedTenantId.value = id
      selectedTenantId.value = id
      return
    }
    await ensureTenantCache()
    await loadSsoForTenant(id)
  },
)

onMounted(async () => {
  if (checkCasCallback()) {
    return
  }

  await ensureTenantCache()

  if (props.subdomainMode) {
    return
  }

  if (props.tenantId) {
    await loadSsoForTenant(props.tenantId)
    return
  }

  const lastSchool = localStorage.getItem(STORAGE_LAST_STUDENT_SCHOOL)
  if (!lastSchool) {
    return
  }
  const matched = tenantCache.value.find((item) => item.tenantName === lastSchool)
  if (matched) {
    await loadSsoForTenant(matched.tenantId)
  }
})

defineExpose({
  handleCasLogin,
  handleCasCallback,
  checkCasCallback,
})
</script>

<style lang="scss" scoped>
.cas-login-container {
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-height: 240px;
  justify-content: flex-start;
}

.cas-login-content {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.cas-school-fixed {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 12px 14px;
  border: 1px solid var(--ant-color-border-secondary);
  border-radius: var(--dp-radius-control);
  background: var(--ant-color-fill-quaternary);
}

.cas-school-fixed__label {
  font-size: 12px;
  color: var(--dp-text-muted);
}

.cas-school-fixed__name {
  font-size: 15px;
  font-weight: 600;
  color: var(--dp-text-primary);
}

.cas-description {
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;

  .cas-icon {
    color: var(--dp-blue-600);
    opacity: 0.85;
  }

  h3 {
    font-size: 18px;
    font-weight: 600;
    color: var(--dp-text-primary);
    margin: 0;
  }

  p {
    color: var(--dp-text-muted);
    font-size: 14px;
    margin: 0;
  }
}

.cas-tips {
  width: 100%;
  padding: 14px 18px;
  background: var(--dp-gray-50);
  border-radius: var(--dp-radius-control);
  text-align: left;

  p {
    margin: 4px 0;
    font-size: 13px;
    color: var(--dp-text-muted);
    line-height: 1.6;
  }
}

.cas-hint,
.cas-disabled,
.cas-load-failed {
  padding: 16px;
  border-radius: var(--dp-radius-control);
  background: var(--dp-gray-50);
  color: var(--dp-text-secondary);
  font-size: 14px;
  line-height: 1.6;
  text-align: center;
}

.cas-load-failed {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;

  p {
    margin: 0;
  }
}

.cas-disabled__hint {
  margin: 8px 0 0;
  font-size: 13px;
  color: var(--dp-text-muted);
}

.cas-error {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 10px 14px;
  background: var(--dp-red-50);
  border: 1px solid rgba(239, 68, 68, 0.2);
  border-radius: var(--dp-radius-control);
  color: var(--dp-red-500);
  font-size: 13px;

  svg {
    flex-shrink: 0;
  }

  span {
    flex: 1;
  }
}

.cas-error__close {
  border: none;
  background: none;
  color: inherit;
  cursor: pointer;
  font-size: 16px;
  padding: 0 4px;
  opacity: 0.6;

  &:hover {
    opacity: 1;
  }
}
</style>
