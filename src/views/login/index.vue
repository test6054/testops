<template>
  <article class="seo-content" aria-hidden="true">
    <h1>教学质量中心 - 高校考试阅卷与教学质量治理平台</h1>
    <p>
      覆盖考试阅卷、OBE
      质量评价与教师档案治理：扫描录入、智能识别、批阅复核、成绩发布、达成度分析与认证支撑。
    </p>
  </article>

  <div class="login-page">
    <!-- 右上角 Logo -->
    <div class="login-brand__top">
      <img src="/logo.svg" alt="教学质量中心" class="login-brand__logo" />
      <div class="login-brand__mark">
        <div class="login-brand__name">教学质量中心</div>
        <div class="login-brand__sub">TEACHING QUALITY</div>
      </div>
    </div>

    <main class="login-stage">
      <section class="login-brand">
        <div class="login-brand__layout">
          <div class="login-brand__content-row">
            <div class="login-brand__capability-column">
              <div class="login-brand__hero">
                <div class="login-brand__visual">
                  <img
                    :src="loginHeroVisual"
                    alt="教学质量中心平台能力示意图"
                    class="login-brand__visual-image"
                  />
                </div>
              </div>
            </div>

            <section class="login-panel">
              <div class="login-panel__header">
                <h3 class="login-panel__title">欢迎登录</h3>
                <p v-if="isSubdomain && subdomainTenant" class="login-panel__subtitle">
                  {{ subdomainTenant.tenantName }}
                </p>
                <p v-else class="login-panel__subtitle">请选择登录方式</p>
              </div>

              <div class="login-panel__surface">
                <div v-if="isSubdomain" class="login-body">
                  <UiStateBlock
                    v-if="subdomainLoading"
                    state="loading"
                    title="正在识别学校..."
                    compact
                  />
                  <StudentLogin v-else :subdomain-mode="true" :subdomain-tenant="subdomainTenant" />
                </div>

                <div v-else class="login-body">
                  <UiRadioGroup v-model="activeTab" :options="loginTabItems" block size="lg" />

                  <div class="login-tab-content">
                    <AccountLogin
                      v-if="activeTab === '1'"
                      @switch-to-student="switchToStudentTab"
                    />
                    <StudentLogin
                      v-if="activeTab === '2'"
                      :subdomain-mode="false"
                      :prefill-data="studentPrefill"
                    />
                    <CasLogin
                      v-if="activeTab === '3'"
                      :tenant-id="casTenantId"
                      :subdomain-mode="false"
                      @tenant-ready="onCasTenantReady"
                    />
                  </div>
                </div>
              </div>
            </section>
          </div>
        </div>
      </section>
    </main>

    <footer class="login-footer">
      <p class="login-footer__copy">{{ copyright }} · 京ICP备13021011号</p>
    </footer>
  </div>
</template>

<script lang="ts" setup>
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { getCasLoginUrl } from '@/apis/sso'
import loginHeroVisual from '@/assets/login/login-hero-visual.png'
import UiRadioGroup from '@/components/ui-guide/ui/UiRadioGroup.vue'
import UiStateBlock from '@/components/ui-guide/ui/UiStateBlock.vue'
import { resetAuthState } from '@/config/axios/auth-state'
import { useAppStore } from '@/stores'
import { showUserError } from '@/utils/error-handler'

import { resolveSubdomainTenant, subdomainLoading, subdomainTenant } from '@/utils/subdomain'
import AccountLogin from './components/account/index.vue'
import CasLogin from './components/cas/index.vue'
import StudentLogin from './components/student/index.vue'

defineOptions({ name: 'Login' })

const route = useRoute()
const appStore = useAppStore()

const isSubdomain = ref(false)
const activeTab = ref('1')
const studentPrefill = ref<{ studentNo: string, password: string }>({ studentNo: '', password: '' })

/** CAS 回跳或深链带来的预置租户；无子域时由 CasLogin 内选校解析 */
const casTenantId = ref<string>('')
const casTabLabel = ref('统一认证')
const copyright = computed(() => appStore.getCopyright())

const loginTabItems = computed(() => [
  { value: '1', label: '账号登录' },
  { value: '2', label: '学号登录' },
  { value: '3', label: casTabLabel.value },
])

function switchToStudentTab(val: { studentNo: string, password: string }) {
  activeTab.value = '2'
  studentPrefill.value = {
    studentNo: val.studentNo,
    password: val.password,
  }
}

function onCasTenantReady(payload: { tenantId: string, casEnabled: boolean, displayName: string }) {
  casTenantId.value = payload.tenantId
  if (payload.displayName) {
    casTabLabel.value = payload.displayName
  }
}

function checkCasCallback(): boolean {
  const ticket = queryString(route.query.ticket)
  const tenantId = queryString(route.query.tenantId)

  if (ticket && tenantId) {
    casTenantId.value = tenantId
    activeTab.value = '3'
    return true
  }
  return false
}

function shouldAutoTriggerCas(): boolean {
  const autoCas = queryString(route.query.autoCas)
  return autoCas === '1' || autoCas === 'true'
}

async function resolveCurrentTenantId(): Promise<string> {
  const routeTenantId = queryString(route.query.tenantId)
  if (routeTenantId) {
    return routeTenantId
  }

  const resolvedTenant = await resolveSubdomainTenant()
  if (resolvedTenant?.tenantId) {
    return resolvedTenant.tenantId
  }

  return ''
}

function queryString(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

async function triggerAutoCasLogin() {
  if (!casTenantId.value) {
    return
  }

  activeTab.value = '3'
  const loginUrl = await getCasLoginUrl(casTenantId.value)
  if (!loginUrl) {
    throw new Error('统一认证暂不可用')
  }
  window.location.href = loginUrl
}

onMounted(async () => {
  resetAuthState()

  const isCasReturn = checkCasCallback()
  const seedTenantId = casTenantId.value || (await resolveCurrentTenantId())
  if (seedTenantId) {
    casTenantId.value = seedTenantId
  }

  if (isCasReturn) {
    activeTab.value = '3'
    return
  }

  if (seedTenantId && shouldAutoTriggerCas()) {
    try {
      await triggerAutoCasLogin()
    } catch (error) {
      showUserError(error, '自动跳转统一认证失败')
    }
  }
})
</script>

<style lang="scss" scoped>
@use '@/styles/breakpoints' as bp;
:global(html),
:global(body),
:global(#app) {
  height: auto;
  min-height: 100%;
  overflow-x: hidden;
  overflow-y: auto;
}

.seo-content {
  position: absolute;
  left: -9999px;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
}

.login-page {
  --login-bg: var(--dp-surface);
  --login-surface: var(--dp-bg-container);
  --login-text: var(--dp-text-primary);
  --login-muted: var(--dp-text-secondary);
  --login-accent: var(--dp-color-primary);
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  height: auto;
  padding: var(--dp-space-4, 16px) var(--dp-space-6, 24px) var(--dp-space-3, 12px);
  overflow: visible;
  background: var(--login-bg);
}

.login-stage {
  position: relative;
  z-index: 1;
  display: flex;
  flex: 1;
  width: min(1400px, 100%);
  min-height: auto;
  margin: 0 auto;
  align-items: center;
}

.login-brand {
  position: relative;
  display: grid;
  grid-template-rows: auto 1fr;
  gap: var(--dp-space-3, 12px);
  flex: 1;
  min-height: auto;
  padding: 8px 6px 0;
  overflow: visible;
}

.login-brand__top,
.login-brand__layout,
.login-brand__content-row,
.login-brand__capability-column,
.login-brand__hero,
.login-brand__visual {
  position: relative;
}

.login-brand__top {
  position: absolute;
  top: 28px;
  left: 48px;
  display: inline-flex;
  align-items: center;
  gap: 14px;
  z-index: 10;
}

.login-brand__logo {
  width: 34px;
  height: 34px;
}

.login-brand__mark {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.login-brand__name {
  font-size: 22px;
  line-height: 1.1;
  font-weight: 700;
  color: var(--login-text);
}

.login-brand__sub {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.18em;
  color: rgba(23, 52, 93, 0.5);
}

.login-brand__layout {
  display: flex;
  flex-direction: column;
  flex: 1;
  width: min(1320px, 100%);
  margin: 0 auto;
  justify-content: center;
  align-self: center;
  min-height: 0;
  padding-top: 56px;
}

.login-brand__content-row {
  display: grid;
  grid-template-columns: minmax(0, 1.35fr) 400px;
  gap: 28px;
  min-height: 0;
  align-items: center;
}

.login-brand__capability-column {
  display: flex;
  flex-direction: column;
  min-height: 0;
  justify-content: center;
}

.login-brand__hero {
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 1;
  min-height: 0;
  width: 100%;
}

.login-brand__visual {
  width: 100%;
  max-width: none;
  height: clamp(480px, 78vh, 820px);
  display: flex;
  align-items: center;
  justify-content: center;
}

.login-brand__visual-image {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: contain;
  object-position: center left;
  transform: scale(1.08);
  transform-origin: center center;
}

.login-panel {
  position: relative;
  z-index: 2;
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  align-self: center;
  width: 100%;
  padding: 0;
  gap: 0;
  border-radius: var(--dp-radius-panel);
  background: transparent;
  box-shadow: var(--dp-shadow-md);
  backdrop-filter: none;
}

.login-panel__header {
  margin-bottom: 0;
  padding: var(--dp-space-4, 16px) var(--dp-space-4, 16px) var(--dp-space-3, 12px);
  border-radius: var(--dp-radius-panel) var(--dp-radius-panel) 0 0;
  background: var(--login-surface);
  border: 1px solid var(--dp-border-subtle);
  border-bottom: none;
}

.login-panel__title {
  margin: 0;
  font-size: 22px;
  line-height: 1.3;
  font-weight: 600;
  color: var(--login-text);
}

.login-panel__subtitle {
  margin: 8px 0 0;
  font-size: 13px;
  line-height: 1.7;
  color: var(--login-muted);
}

.login-panel__surface {
  padding: var(--dp-space-3, 12px) var(--dp-space-4, 16px) var(--dp-space-4, 16px);
  border-radius: 0 0 var(--dp-radius-panel) var(--dp-radius-panel);
  background: var(--login-surface);
  border: 1px solid var(--dp-border-subtle);
  border-top: none;
}

.login-body {
  display: flex;
  flex-direction: column;
  gap: var(--dp-space-3, 12px);
}

.login-tab-content {
  margin-top: var(--dp-space-3, 12px);

  :deep(.ui-radio-group :where(.ant-radio-group)) {
    gap: 3px;
    padding: 3px;
    border-color: var(--dp-border-subtle);
    background: var(--dp-fill-quaternary);
  }

  :deep(.ui-radio-group .ant-radio-button-wrapper) {
    min-height: 34px;
    padding: 0 14px;
    font-size: 13px;
    font-weight: 600;
    line-height: 34px;
    color: var(--dp-text-secondary);
  }

  :deep(.ui-radio-group .ant-radio-button-wrapper-checked:not(.ant-radio-button-wrapper-disabled)) {
    background: var(--dp-bg-container);
    color: var(--dp-text-primary);
    box-shadow: 0 0 0 1px var(--dp-border) inset;
  }

  :deep(.ui-radio-group .ant-radio-button-wrapper:hover:not(.ant-radio-button-wrapper-disabled)) {
    color: var(--dp-text-primary);
  }

  :deep(.ant-form-item) {
    margin-bottom: 18px;
  }

  :deep(.ui-radio-group) {
    width: 100%;
  }

  :deep(.ui-input__control),
  :deep(.ui-password-input__control),
  :deep(.school-autocomplete__input .ant-select-selector) {
    border-radius: var(--dp-radius-control);
  }

  :deep(.ui-button--size-lg) {
    min-height: 48px;
    border-radius: var(--dp-radius-control);
    font-weight: 700;
  }
}

.login-footer {
  position: relative;
  z-index: 1;
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: flex-end;
  width: min(1360px, 100%);
  margin: 8px auto 0;
}

.login-footer__copy {
  margin: 0;
  font-size: 12px;
  color: rgba(84, 108, 143, 0.72);
}

@media (max-width: 1180px) {
  .login-stage {
    display: block;
    padding-top: 0;
  }

  .login-brand {
    min-height: auto;
  }

  .login-brand__top {
    position: relative;
    top: auto;
    left: auto;
    z-index: 1;
    width: 100%;
    margin-bottom: 4px;
  }

  .login-brand__layout {
    width: 100%;
    gap: 28px;
    padding-top: 0;
  }

  .login-brand__content-row {
    grid-template-columns: 1fr;
    gap: 28px;
  }

  .login-brand__capability-column {
    min-height: auto;
  }

  .login-brand__hero {
    min-height: auto;
  }

  .login-brand__visual {
    width: 100%;
    height: min(560px, 72vw);
    max-width: none;
  }

  .login-brand__visual-image {
    transform: scale(1.04);
    object-position: center;
  }
}

@media (max-width: bp.$layout-mobile-max) {
  .login-page {
    padding: 16px 12px 16px;
  }

  .login-stage {
    gap: var(--dp-space-3, 12px);
    min-height: auto;
  }

  .login-brand__top {
    margin-bottom: 8px;
  }

  .login-brand,
  .login-panel {
    border-radius: 24px;
  }

  .login-brand {
    gap: var(--dp-space-4, 16px);
    padding: 12px 4px 8px;
  }

  .login-brand__layout {
    gap: var(--dp-space-4, 16px);
    padding-top: 8px;
  }

  .login-brand__content-row {
    gap: 22px;
  }

  .login-panel {
    padding: 0;
    width: 100%;
  }

  .login-panel__header {
    padding: 18px 16px 12px;
  }

  .login-panel__surface {
    margin-top: -1px;
    padding: 16px;
  }

  .login-brand__visual {
    height: auto;
    max-height: none;
  }

  .login-footer {
    justify-content: flex-start;
  }
}
</style>
