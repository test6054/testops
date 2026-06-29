<template>
  <AuthLayout>
    <div class="cas-completion">
      <div class="cas-completion__header">
        <p class="cas-completion__eyebrow">统一认证首次登录</p>
        <h1 class="cas-completion__title">补录身份信息</h1>
        <p class="cas-completion__subtitle">
          首次接入学校统一认证后，需要补齐当前账号在教学质量中心的基础身份信息。
        </p>
      </div>

      <UiStateBlock
        v-if="!completionToken"
        state="error"
        title="缺少补录凭证"
        description="当前链接未携带有效的补录令牌，无法继续完成统一认证登录。"
        helper="请返回登录页重新发起统一认证登录。"
        compact
      >
        <template #actions>
          <UiButton variant="outline" @click="goLogin">返回登录页</UiButton>
        </template>
      </UiStateBlock>

      <UiStateBlock
        v-else-if="pageState === 'loading'"
        state="loading"
        title="正在加载补录信息"
        description="系统正在校验统一认证返回的用户上下文，请稍候。"
        compact
      />

      <UiStateBlock
        v-else-if="pageState === 'error'"
        state="error"
        title="补录信息加载失败"
        :description="pageErrorMessage"
        helper="请返回登录页重新发起统一认证登录。"
        compact
      >
        <template #actions>
          <UiButton variant="outline" @click="goLogin">返回登录页</UiButton>
        </template>
      </UiStateBlock>

      <section v-else class="cas-completion__panel">
        <div class="cas-completion__summary">
          <div class="cas-completion__summary-item">
            <span class="cas-completion__summary-label">登录身份</span>
            <span class="cas-completion__summary-value">{{ roleLabel }}</span>
          </div>
          <div class="cas-completion__summary-item">
            <span class="cas-completion__summary-label">姓名</span>
            <span class="cas-completion__summary-value">
              {{ context?.prefillData?.nickName || '未提供' }}
            </span>
          </div>
          <div class="cas-completion__summary-item">
            <span class="cas-completion__summary-label">邮箱</span>
            <span class="cas-completion__summary-value">
              {{ context?.prefillData?.email || '未提供' }}
            </span>
          </div>
        </div>

        <form class="cas-completion__form" @submit.prevent="handleSubmit">
          <UiFormField
            v-if="shouldRenderField('studentNumber')"
            label="学号"
            required
            :error="fieldErrors.studentNumber"
            for-id="student-number"
          >
            <UiInput
              id="student-number"
              v-model="form.studentNumber"
              :maxlength="64"
              placeholder="请输入学号"
              :disabled="submitting"
            />
          </UiFormField>

          <UiFormField
            v-if="shouldRenderField('teacherNumber')"
            label="工号"
            required
            :error="fieldErrors.teacherNumber"
            for-id="teacher-number"
          >
            <UiInput
              id="teacher-number"
              v-model="form.teacherNumber"
              :maxlength="64"
              placeholder="请输入工号"
              :disabled="submitting"
            />
          </UiFormField>

          <UiFormField
            v-if="shouldRenderField('classId')"
            label="班级"
            required
            :error="fieldErrors.classId"
            :help="classFieldHelp"
            for-id="class-id"
          >
            <UiSelect
              id="class-id"
              v-model="form.classId"
              :options="classOptions"
              :loading="loadingClasses"
              :disabled="submitting || loadingClasses || classOptions.length === 0"
              :allow-search="true"
              :allow-clear="false"
              placeholder="请选择班级"
            />
          </UiFormField>

          <UiFormField
            v-if="shouldRenderField('department')"
            label="院系"
            required
            :error="fieldErrors.department"
            for-id="department"
          >
            <UiInput
              id="department"
              v-model="form.department"
              :maxlength="64"
              placeholder="请输入院系名称"
              :disabled="submitting"
            />
          </UiFormField>

          <UiFormField
            v-if="shouldRenderField('title')"
            label="职称"
            required
            :error="fieldErrors.title"
            for-id="title"
          >
            <UiInput
              id="title"
              v-model="form.title"
              :maxlength="64"
              placeholder="请输入职称"
              :disabled="submitting"
            />
          </UiFormField>

          <p v-if="submitErrorMessage" class="cas-completion__submit-error">
            {{ submitErrorMessage }}
          </p>

          <div class="cas-completion__actions">
            <UiButton type="submit" variant="primary" size="lg" block :loading="submitting">
              {{ submitting ? '正在提交补录信息...' : '确认并继续登录' }}
            </UiButton>
            <UiButton variant="ghost" size="lg" block :disabled="submitting" @click="goLogin">
              返回登录页
            </UiButton>
          </div>
        </form>
      </section>
    </div>
  </AuthLayout>
</template>

<script lang="ts" setup>
import type {
  CasAvailableClassResponse,
  CasFirstLoginSubmitRequest,
  CasProfileCompletionResponse,
} from '@/apis/sso'
import type { UiSelectOption } from '@/components/ui-guide/ui/types'
import message from 'ant-design-vue/es/message'
import { computed, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  completeCasFirstLogin,
  getCasAvailableClasses,
  getCasFirstLoginContext,
} from '@/apis/sso'
import AuthLayout from '@/components/AuthLayout/index.vue'
import UiButton from '@/components/ui-guide/ui/Button.vue'
import UiInput from '@/components/ui-guide/ui/Input.vue'
import UiFormField from '@/components/ui-guide/ui/UiFormField.vue'
import UiSelect from '@/components/ui-guide/ui/UiSelect.vue'
import UiStateBlock from '@/components/ui-guide/ui/UiStateBlock.vue'
import { getDefaultRoute } from '@/router/permission'
import { useAuthStore, useUserStore } from '@/stores'
import { getUserErrorMessage, showUserError } from '@/utils/error-handler'
import { shouldEnforcePasswordChange } from '@/utils/password-change-enforcement'
import { strictEnumLabel } from '@/utils/strict-enum'

defineOptions({ name: 'CasFirstLoginCompletion' })

type CasCompletionField = 'studentNumber' | 'teacherNumber' | 'classId' | 'department' | 'title'
type PageState = 'loading' | 'ready' | 'error'

interface FieldErrors {
  studentNumber: string
  teacherNumber: string
  classId: string
  department: string
  title: string
}

const ROLE_LABEL_MAP: Record<string, string> = {
  SCH_STU: '学生',
  SCH_TECH: '教师',
  CROP_ADMIN: '教师',
  CROP_USER: '教师',
}

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const userStore = useUserStore()

const completionToken = computed(() => {
  const token = route.query.completionToken
  return typeof token === 'string' ? token.trim() : ''
})

const pageState = ref<PageState>(completionToken.value ? 'loading' : 'error')
const loading = ref(false)
const loadingClasses = ref(false)
const submitting = ref(false)
const pageErrorMessage = ref('')
const submitErrorMessage = ref('')
const context = ref<CasProfileCompletionResponse | null>(null)
const availableClasses = ref<CasAvailableClassResponse[]>([])

const form = reactive<CasFirstLoginSubmitRequest>({
  completionToken: '',
  studentNumber: '',
  teacherNumber: '',
  classId: '',
  department: '',
  title: '',
})

const fieldErrors = reactive<FieldErrors>({
  studentNumber: '',
  teacherNumber: '',
  classId: '',
  department: '',
  title: '',
})

const missingFields = computed<CasCompletionField[]>(() => {
  const fields = context.value?.missingFields ?? []
  return fields.filter((field): field is CasCompletionField =>
    ['studentNumber', 'teacherNumber', 'classId', 'department', 'title'].includes(field),
  )
})

const roleLabel = computed(() => {
  const roleKey = context.value?.lockedRoleKey ?? ''
  if (!roleKey) {
    return ''
  }
  return strictEnumLabel(ROLE_LABEL_MAP, roleKey, 'CAS 锁定角色')
})

const classOptions = computed<UiSelectOption[]>(() => {
  return availableClasses.value.map((item) => ({
    label: item.majorName ? `${item.className} · ${item.majorName}` : item.className,
    value: item.id,
  }))
})

const classFieldHelp = computed(() => {
  if (!shouldRenderField('classId')) {
    return ''
  }
  if (loadingClasses.value) {
    return '正在加载当前统一认证可选班级。'
  }
  if (!classOptions.value.length) {
    return '当前未返回可选班级，请检查统一认证绑定数据。'
  }
  return '请选择当前登录身份所属班级。'
})

function shouldRenderField(field: CasCompletionField): boolean {
  return missingFields.value.includes(field)
}

function clearFieldErrors(): void {
  fieldErrors.studentNumber = ''
  fieldErrors.teacherNumber = ''
  fieldErrors.classId = ''
  fieldErrors.department = ''
  fieldErrors.title = ''
}

function hydrateForm(nextContext: CasProfileCompletionResponse): void {
  const prefillData = nextContext.prefillData
  form.completionToken = nextContext.completionToken
  form.studentNumber = prefillData?.studentNumber?.trim() || ''
  form.teacherNumber = prefillData?.teacherNumber?.trim() || ''
  form.classId = prefillData?.classId?.trim() || ''
  form.department = prefillData?.department?.trim() || ''
  form.title = prefillData?.title?.trim() || ''
}

async function loadAvailableClasses(): Promise<void> {
  if (!completionToken.value || !shouldRenderField('classId')) {
    availableClasses.value = []
    return
  }
  loadingClasses.value = true
  try {
    availableClasses.value = await getCasAvailableClasses(completionToken.value)
  } catch (error: unknown) {
    availableClasses.value = []
    fieldErrors.classId = getUserErrorMessage(error, '统一认证可选班级加载失败')
    throw error
  } finally {
    loadingClasses.value = false
  }
}

async function initialize(): Promise<void> {
  if (!completionToken.value) {
    pageState.value = 'error'
    pageErrorMessage.value = '当前补录链接缺少 completionToken。'
    return
  }
  loading.value = true
  pageState.value = 'loading'
  pageErrorMessage.value = ''
  submitErrorMessage.value = ''
  clearFieldErrors()
  try {
    const nextContext = await getCasFirstLoginContext(completionToken.value)
    context.value = nextContext
    hydrateForm(nextContext)
    await loadAvailableClasses()
    pageState.value = 'ready'
  } catch (error: unknown) {
    context.value = null
    availableClasses.value = []
    pageState.value = 'error'
    pageErrorMessage.value = getUserErrorMessage(error, '统一认证补录上下文获取失败，请重新登录后再试')
    showUserError(error, '统一认证补录上下文获取失败')
  } finally {
    loading.value = false
  }
}

function validateForm(): boolean {
  clearFieldErrors()
  let valid = true

  if (shouldRenderField('studentNumber') && !form.studentNumber?.trim()) {
    fieldErrors.studentNumber = '请输入学号'
    valid = false
  }
  if (shouldRenderField('teacherNumber') && !form.teacherNumber?.trim()) {
    fieldErrors.teacherNumber = '请输入工号'
    valid = false
  }
  if (shouldRenderField('classId') && !form.classId?.trim()) {
    fieldErrors.classId = '请选择班级'
    valid = false
  }
  if (shouldRenderField('department') && !form.department?.trim()) {
    fieldErrors.department = '请输入院系'
    valid = false
  }
  if (shouldRenderField('title') && !form.title?.trim()) {
    fieldErrors.title = '请输入职称'
    valid = false
  }

  return valid
}

async function finalizeLogin(result: Awaited<ReturnType<typeof completeCasFirstLogin>>): Promise<void> {
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
}

async function handleSubmit(): Promise<void> {
  if (!context.value) {
    return
  }
  submitErrorMessage.value = ''
  if (!validateForm()) {
    return
  }

  submitting.value = true
  try {
    const result = await completeCasFirstLogin({
      completionToken: form.completionToken,
      studentNumber: shouldRenderField('studentNumber') ? form.studentNumber?.trim() : undefined,
      teacherNumber: shouldRenderField('teacherNumber') ? form.teacherNumber?.trim() : undefined,
      classId: shouldRenderField('classId') ? form.classId?.trim() : undefined,
      department: shouldRenderField('department') ? form.department?.trim() : undefined,
      title: shouldRenderField('title') ? form.title?.trim() : undefined,
    })
    await finalizeLogin(result)
    message.success('统一认证补录完成')
  } catch (error: unknown) {
    submitErrorMessage.value = getUserErrorMessage(error, '统一认证补录提交失败，请检查后重试')
    showUserError(error, '统一认证补录提交失败')
  } finally {
    submitting.value = false
  }
}

function goLogin(): void {
  void router.push('/login')
}

void initialize()
</script>

<style lang="scss" scoped>
.cas-completion {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.cas-completion__header {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.cas-completion__eyebrow {
  margin: 0;
  font-size: 12px;
  font-weight: 700;
  color: var(--dp-blue-600, #2563eb);
}

.cas-completion__title {
  margin: 0;
  font-size: 28px;
  line-height: 1.25;
  font-weight: 800;
  color: var(--dp-text-primary, #0f172a);
}

.cas-completion__subtitle {
  margin: 0;
  font-size: 14px;
  line-height: 1.7;
  color: var(--dp-text-secondary, #475569);
}

.cas-completion__panel {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.cas-completion__summary {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}

.cas-completion__summary-item {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 14px 14px 12px;
  border: 1px solid var(--dp-border, #e5e7eb);
  border-radius: var(--dp-radius-panel, 4px);
  background: var(--dp-surface, #fff);
}

.cas-completion__summary-label {
  font-size: 12px;
  line-height: 1.4;
  color: var(--dp-text-muted, #6b7280);
}

.cas-completion__summary-value {
  font-size: 14px;
  line-height: 1.6;
  font-weight: 700;
  color: var(--dp-text-primary, #0f172a);
  word-break: break-all;
}

.cas-completion__form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.cas-completion__submit-error {
  margin: 0;
  font-size: 13px;
  line-height: 1.6;
  color: var(--dp-red-500, #ef4444);
}

.cas-completion__actions {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: 4px;
}

@media (max-width: 900px) {
  .cas-completion__summary {
    grid-template-columns: 1fr;
  }
}
</style>
