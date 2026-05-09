<template>
  <article class="seo-content" aria-hidden="true">
    <h1>阅卷中心 - 高校在线试卷批改与成绩管理平台</h1>
    <p>覆盖纸质试卷扫描录入、影像账本、智能识别、教师匿名批阅、复核审计、成绩发布与解匿名查分的完整阅卷链路。</p>
  </article>

  <div class="login-page">
    <div class="login-page__glow login-page__glow--left" />
    <div class="login-page__glow login-page__glow--right" />

    <!-- 右上角 Logo -->
    <div class="login-brand__top">
      <img src="/logo.svg" alt="阅卷中心" class="login-brand__logo">
      <div class="login-brand__mark">
        <div class="login-brand__name">阅卷中心</div>
        <div class="login-brand__sub">EDU MARK WEB</div>
      </div>
    </div>

    <main class="login-stage">
      <section class="login-brand">
        <div class="login-brand__layout">
          <div class="login-brand__content-row">
            <div class="login-brand__capability-column">
              <div class="login-brand__hero">
                <div class="login-brand__visual">
                  <img :src="loginHeroVisual" alt="阅卷中心平台能力示意图" class="login-brand__visual-image">
                </div>
              </div>
            </div>

            <section class="login-panel">
              <div class="login-panel__header">
                <p class="login-panel__eyebrow">欢迎回来</p>
                <h3 class="login-panel__title">登录阅卷中心</h3>
                <p v-if="isSubdomain && subdomainTenant" class="login-panel__subtitle">{{ subdomainTenant.tenantName }}</p>
                <p v-else class="login-panel__subtitle">请选择登录方式并完成身份验证。</p>
              </div>

              <div class="login-panel__surface">
                <div v-if="isSubdomain" class="login-body">
                  <UiStateBlock v-if="subdomainLoading" state="loading" title="正在识别学校..." compact />
                  <StudentLogin v-else :subdomain-mode="true" :subdomain-tenant="subdomainTenant" />
                </div>

                <div v-else class="login-body">
                  <UiRadioGroup
                    v-model="activeTab"
                    :options="loginTabItems"
                    block
                    size="lg"
                  />

                  <div class="login-tab-content">
                    <AccountLogin v-if="activeTab === '1'" @switch-to-student="switchToStudentTab" />
                    <StudentLogin v-if="activeTab === '2'" :subdomain-mode="false" :prefill-data="studentPrefill" />
                    <CasLogin v-if="activeTab === '3'" :tenant-id="casTenantId" :display-name="casDisplayName" />
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
import type { SsoConfigResponse } from '@/apis/sso'
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { getCasLoginUrl, getSsoConfig } from '@/apis/sso'
import loginHeroVisual from '@/assets/login/login-hero-visual.svg'
import { UiRadioGroup, UiStateBlock } from '@/components/ui-guide/ui'
import { resetAuthState } from '@/config/axios/auth-state'
import { useAppStore } from '@/stores'
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

const ssoConfig = ref<SsoConfigResponse | null>(null)
const casEnabled = computed(() => ssoConfig.value?.casEnabled ?? false)
const casDisplayName = computed(() => ssoConfig.value?.casDisplayName || '统一认证')
const casTenantId = ref<string>('')
const isCasCallback = ref(false)
const copyright = computed(() => appStore.getCopyright())

const loginTabItems = computed(() => {
  const items: { value: string, label: string }[] = [
    { value: '1', label: '账号登录' },
    { value: '2', label: '学号登录' },
  ]
  if (casEnabled.value) {
    items.push({ value: '3', label: casDisplayName.value })
  }
  return items
})

function switchToStudentTab(val: { studentNo: string, password: string }) {
  activeTab.value = '2'
  studentPrefill.value = {
    studentNo: val.studentNo,
    password: val.password,
  }
}

function checkCasCallback(): boolean {
  const ticket = route.query.ticket as string
  const tenantId = route.query.tenantId as string

  if (ticket && tenantId) {
    isCasCallback.value = true
    casTenantId.value = tenantId
    activeTab.value = '3'
    return true
  }
  return false
}

function shouldAutoTriggerCas(): boolean {
  const autoCas = route.query.autoCas as string | undefined
  return autoCas === '1' || autoCas === 'true'
}

async function resolveCurrentTenantId(): Promise<string> {
  const routeTenantId = route.query.tenantId as string | undefined
  if (routeTenantId) {
    return routeTenantId
  }

  const resolvedTenant = await resolveSubdomainTenant()
  if (resolvedTenant?.tenantId) {
    return resolvedTenant.tenantId
  }

  return ''
}

async function triggerAutoCasLogin() {
  if (!casTenantId.value) {
    return
  }

  activeTab.value = '3'
  window.location.href = await getCasLoginUrl(casTenantId.value)
}

async function fetchSsoConfig() {
  const tenantId = casTenantId.value || (await resolveCurrentTenantId())

  if (!tenantId) {
    ssoConfig.value = { casEnabled: false, casDisplayName: '统一认证' }
    return
  }

  try {
    const config = await getSsoConfig(tenantId)
    ssoConfig.value = config

    if (config.casEnabled) {
      casTenantId.value = tenantId
    }
  } catch {
    ssoConfig.value = { casEnabled: false, casDisplayName: '统一认证' }
  }
}

onMounted(async () => {
  resetAuthState()

  const isCasReturn = checkCasCallback()

  await fetchSsoConfig()

  if (isCasReturn && casEnabled.value) {
    activeTab.value = '3'
    return
  }

  if (casEnabled.value && shouldAutoTriggerCas()) {
    await triggerAutoCasLogin()
  }
})
</script>

<style lang="scss" scoped>
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
  --login-bg: #eaf3ff;
  --login-surface: rgba(255, 255, 255, 0.9);
  --login-text: #17345d;
  --login-muted: #607696;
  --login-accent: #3c7af0;
  box-sizing: border-box;
  position: relative;
  display: flex;
  flex-direction: column;
  height: 100vh;
  padding: 24px 36px 18px;
  overflow: hidden;
  background:
    radial-gradient(circle at 15% 18%, rgba(123, 171, 255, 0.22) 0%, rgba(123, 171, 255, 0) 26%),
    radial-gradient(circle at 86% 22%, rgba(159, 206, 255, 0.28) 0%, rgba(159, 206, 255, 0) 24%),
    linear-gradient(180deg, #f6faff 0%, #eaf3ff 100%);
}

.login-page__glow {
  position: absolute;
  border-radius: 999px;
  filter: blur(12px);
  pointer-events: none;
}

.login-page__glow--left {
  top: 90px;
  left: 120px;
  width: 280px;
  height: 280px;
  background: rgba(140, 184, 255, 0.2);
}

.login-page__glow--right {
  right: 100px;
  bottom: 140px;
  width: 320px;
  height: 320px;
  background: rgba(188, 222, 255, 0.22);
}

.login-stage {
  position: relative;
  z-index: 1;
  display: flex;
  flex: 1;
  width: min(1400px, 100%);
  min-height: 0;
  margin: 0 auto;
  align-items: center;
}

.login-brand {
  position: relative;
  display: grid;
  grid-template-rows: auto 1fr;
  gap: 18px;
  flex: 1;
  min-height: 0;
  padding: 8px 6px 0;
  overflow: hidden;
}

.login-brand::before {
  content: '';
  position: absolute;
  inset: 10px 0 84px;
  background:
    linear-gradient(rgba(113, 152, 204, 0.06) 1px, transparent 1px),
    linear-gradient(90deg, rgba(113, 152, 204, 0.06) 1px, transparent 1px);
  background-size: 56px 56px;
  opacity: 0.55;
  pointer-events: none;
}

.login-brand__top,
.login-brand__layout,
.login-brand__content-row,
.login-brand__capability-column,
.login-brand__hero,
.login-brand__visual {
  position: relative;
  z-index: 1;
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
  font-size: 28px;
  line-height: 1;
  font-weight: 800;
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
  width: min(1180px, 100%);
  margin: 0 auto;
  justify-content: center;
  align-self: center;
  min-height: 0;
  padding-top: 0;
}

.login-brand__content-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 420px;
  gap: 56px;
  min-height: 0;
  align-items: center;
}

.login-brand__capability-column {
  display: flex;
  flex-direction: column;
}

.login-brand__hero {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100%;
}

.login-brand__visual {
  width: min(700px, 100%);
  height: clamp(430px, 54vh, 560px);
  display: flex;
  align-items: center;
  justify-content: center;
}

.login-brand__visual::before {
  content: '';
  position: absolute;
  inset: 12% 8% 14%;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(122, 173, 255, 0.18) 0%, rgba(122, 173, 255, 0.02) 64%, transparent 100%);
  filter: blur(24px);
  pointer-events: none;
}

.login-brand__visual-image {
  position: relative;
  z-index: 1;
  display: block;
  max-width: 100%;
  max-height: 100%;
  width: auto;
  height: auto;
  filter: drop-shadow(0 32px 48px rgba(94, 130, 183, 0.12));
}

.login-panel {
  position: relative;
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  align-self: center;
  width: 100%;
  padding: 0;
  gap: 0;
  border-radius: var(--dp-radius-panel, 8px);
  background: transparent;
  box-shadow: none;
  backdrop-filter: none;
}

.login-panel__header {
  margin-bottom: 0;
  padding: 20px 20px 14px;
  border-radius: var(--dp-radius-panel, 8px) var(--dp-radius-panel, 8px) 0 0;
  background: rgba(255, 255, 255, 0.92);
  box-shadow: 0 18px 40px rgba(79, 108, 157, 0.1);
}

.login-panel__eyebrow {
  margin: 0 0 8px;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.14em;
  color: var(--login-accent);
}

.login-panel__title {
  margin: 0;
  font-size: 34px;
  line-height: 1.12;
  font-weight: 800;
  color: #10294b;
}

.login-panel__subtitle {
  margin: 10px 0 0;
  font-size: 14px;
  line-height: 1.7;
  color: var(--login-muted);
}

.login-panel__surface {
  padding: 20px;
  margin-top: -2px;
  border-radius: 0 0 var(--dp-radius-panel, 8px) var(--dp-radius-panel, 8px);
  background: rgba(255, 255, 255, 0.92);
  box-shadow: 0 18px 40px rgba(79, 108, 157, 0.1);
}

.login-body {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.login-tab-content {
  margin-top: 24px;

  :deep(.ui-radio-group :where(.ant-radio-group)) {
    gap: 3px;
    padding: 3px;
    border-color: rgba(207, 217, 232, 0.92);
    background: #eef2f7;
    box-shadow: inset 0 1px 1px rgba(15, 23, 42, 0.03);
  }

  :deep(.ui-radio-group .ant-radio-button-wrapper) {
    min-height: 34px;
    padding: 0 14px;
    font-size: 13px;
    font-weight: 600;
    line-height: 34px;
    color: #60708a;
  }

  :deep(.ui-radio-group .ant-radio-button-wrapper-checked:not(.ant-radio-button-wrapper-disabled)) {
    background: #fff;
    color: #16345d;
    box-shadow:
      0 1px 2px rgba(15, 23, 42, 0.08),
      0 0 0 1px rgba(210, 219, 232, 0.9) inset;
  }

  :deep(.ui-radio-group .ant-radio-button-wrapper:hover:not(.ant-radio-button-wrapper-disabled)) {
    color: #27476f;
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
    border-radius: 14px;
  }

  :deep(.ui-button--size-lg) {
    min-height: 48px;
    border-radius: 14px;
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
  }

  .login-brand {
    min-height: auto;
  }

  .login-brand__top,
  .login-brand__layout {
    width: 100%;
    gap: 28px;
    padding-top: 8px;
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
    height: 440px;
    max-width: 720px;
  }
}

@media (max-width: 768px) {
  .login-page {
    height: auto;
    min-height: 100vh;
    padding: 20px 16px 24px;
    overflow: visible;
  }

  .login-stage {
    gap: 18px;
    min-height: auto;
  }

  .login-brand,
  .login-panel {
    border-radius: 24px;
  }

  .login-brand {
    gap: 24px;
    padding: 12px 4px 8px;
  }

  .login-brand__layout {
    gap: 24px;
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
