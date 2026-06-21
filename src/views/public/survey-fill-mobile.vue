<template>
  <div class="m-survey">
    <!-- 加载 -->
    <div v-if="loading" class="m-survey__status">
      <div class="m-survey__spinner" />
      <p class="m-survey__status-text">正在加载问卷…</p>
    </div>

    <!-- 错误 -->
    <div v-else-if="errorMessage" class="m-survey__status">
      <div class="m-survey__icon m-survey__icon--warn">!</div>
      <p class="m-survey__status-title">无法加载问卷</p>
      <p class="m-survey__status-text">{{ errorMessage }}</p>
      <p class="m-survey__status-hint">请检查链接是否正确，或联系问卷发布者</p>
      <button type="button" class="m-survey__btn m-survey__btn--retry" @click="loadSurvey">
        重新加载
      </button>
    </div>

    <!-- 提交成功 -->
    <div v-else-if="submitted" class="m-survey__status m-survey__status--success">
      <div class="m-survey__icon m-survey__icon--success">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2.5"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <polyline points="20 6 9 17 4 12" />
        </svg>
      </div>
      <p class="m-survey__status-title">{{ thankYouMessage }}</p>
      <p class="m-survey__status-text">您的回答已成功提交，感谢参与！</p>
    </div>

    <!-- 问卷主体 -->
    <template v-else-if="survey">
      <!-- 封面页 -->
      <div v-if="currentStep === 'cover'" class="m-survey__cover">
        <div class="m-survey__cover-header">
          <div class="m-survey__cover-badge">问卷调查</div>
        </div>
        <div class="m-survey__cover-body">
          <h1 class="m-survey__cover-title">{{ survey.formName }}</h1>
          <p v-if="survey.description" class="m-survey__cover-desc">{{ survey.description }}</p>
          <p v-if="survey.welcomeMessage" class="m-survey__cover-welcome">
            {{ survey.welcomeMessage }}
          </p>
          <div v-if="survey.endTime" class="m-survey__cover-meta">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              width="14"
              height="14"
            >
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
            <span>截止时间：{{ survey.endTime }}</span>
          </div>
          <div class="m-survey__cover-info">
            <span>共 {{ totalCount }} 题</span>
            <span v-if="!survey.allowAnonymous">· 需填写身份信息</span>
          </div>
        </div>
        <div class="m-survey__cover-action">
          <button
            class="m-survey__btn m-survey__btn--primary m-survey__btn--lg"
            @click="startSurvey"
          >
            开始答题
          </button>
        </div>
      </div>

      <!-- 身份信息页 -->
      <div v-else-if="currentStep === 'identity'" class="m-survey__page">
        <div class="m-survey__progress">
          <div class="m-survey__progress-bar" :style="{ width: '0%' }" />
        </div>
        <div class="m-survey__page-body">
          <div class="m-survey__identity-icon">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              width="32"
              height="32"
            >
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
          </div>
          <h2 class="m-survey__page-title">请填写您的信息</h2>
          <p class="m-survey__page-subtitle">以便我们更好地分析问卷结果</p>
          <div v-for="field in survey.identityFields" :key="field.fieldKey" class="m-survey__field">
            <label class="m-survey__field-label">
              {{ field.fieldLabel }}
              <span v-if="field.required" class="m-survey__required">*</span>
            </label>
            <input
              v-model="identityValues[field.fieldKey]"
              type="text"
              class="m-survey__input"
              :placeholder="`请输入${field.fieldLabel}`"
              maxlength="200"
            />
          </div>
        </div>
        <div class="m-survey__nav">
          <button class="m-survey__btn m-survey__btn--ghost" @click="currentStep = 'cover'">
            返回
          </button>
          <button
            class="m-survey__btn m-survey__btn--primary"
            :disabled="!hasRequiredIdentityFilled()"
            @click="goToQuestion(0)"
          >
            下一步
          </button>
        </div>
      </div>

      <!-- 题目页 -->
      <div
        v-else-if="currentStep === 'question'"
        class="m-survey__page"
        :class="{
          'm-survey__page--half': answerCardHeight === 'half',
          'm-survey__page--full': answerCardHeight === 'full',
        }"
      >
        <div class="m-survey__progress">
          <div class="m-survey__progress-bar" :style="{ width: `${progressPercent}%` }" />
          <span class="m-survey__progress-text">{{ currentIndex + 1 }} / {{ totalCount }}</span>
          <div class="m-survey__height-toggle">
            <button
              type="button"
              class="m-survey__height-btn"
              :class="{ 'm-survey__height-btn--active': answerCardHeight === 'half' }"
              @click="answerCardHeight = 'half'"
            >
              半屏
            </button>
            <button
              type="button"
              class="m-survey__height-btn"
              :class="{ 'm-survey__height-btn--active': answerCardHeight === 'full' }"
              @click="answerCardHeight = 'full'"
            >
              全屏
            </button>
          </div>
        </div>

        <transition :name="slideDirection" mode="out-in">
          <div :key="currentIndex" class="m-survey__page-body m-survey__question">
            <div class="m-survey__q-header">
              <span class="m-survey__q-index">Q{{ currentIndex + 1 }}</span>
              <span v-if="currentItem?.required" class="m-survey__required">必填</span>
              <span v-if="currentItem" class="m-survey__q-type">{{
                itemTypeLabel(currentItem.itemType)
              }}</span>
            </div>
            <h2 class="m-survey__q-text">{{ currentItem?.itemText }}</h2>

            <!-- 量表题 -->
            <div v-if="currentItem?.itemType === 'SCALE'" class="m-survey__scale">
              <div class="m-survey__scale-labels">
                <span>{{ scaleOptions[0]?.label || '' }}</span>
                <span>{{ scaleOptions[scaleOptions.length - 1]?.label || '' }}</span>
              </div>
              <div class="m-survey__scale-btns">
                <button
                  v-for="opt in scaleOptions"
                  :key="opt.value"
                  class="m-survey__scale-btn"
                  :class="{
                    'm-survey__scale-btn--active':
                      scaleAnswers[currentItem.itemToken] === opt.value,
                  }"
                  @click="scaleAnswers[currentItem.itemToken] = opt.value"
                >
                  {{ opt.value }}
                </button>
              </div>
            </div>

            <!-- 单选题 -->
            <div v-else-if="currentItem?.itemType === 'SINGLE_CHOICE'" class="m-survey__choices">
              <button
                v-for="(opt, oi) in choiceOptions"
                :key="opt.optionValue"
                class="m-survey__choice"
                :class="{
                  'm-survey__choice--active':
                    singleChoiceAnswers[currentItem.itemToken] === opt.optionValue,
                }"
                @click="singleChoiceAnswers[currentItem.itemToken] = opt.optionValue"
              >
                <span class="m-survey__choice-letter">{{ String.fromCharCode(65 + oi) }}</span>
                <span class="m-survey__choice-text">{{ opt.optionLabel }}</span>
                <span
                  v-if="singleChoiceAnswers[currentItem.itemToken] === opt.optionValue"
                  class="m-survey__choice-check"
                  aria-hidden="true"
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2.5"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    width="18"
                    height="18"
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </span>
              </button>
            </div>

            <!-- 多选题 -->
            <div v-else-if="currentItem?.itemType === 'MULTI_CHOICE'" class="m-survey__choices">
              <button
                v-for="(opt, oi) in choiceOptions"
                :key="opt.optionValue"
                class="m-survey__choice m-survey__choice--multi"
                :class="{
                  'm-survey__choice--active': (multiAnswers[currentItem.itemToken] || []).includes(
                    opt.optionValue,
                  ),
                }"
                @click="toggleMulti(currentItem.itemToken, opt.optionValue)"
              >
                <span class="m-survey__choice-letter">{{ String.fromCharCode(65 + oi) }}</span>
                <span class="m-survey__choice-text">{{ opt.optionLabel }}</span>
                <span
                  v-if="(multiAnswers[currentItem.itemToken] || []).includes(opt.optionValue)"
                  class="m-survey__choice-check"
                  aria-hidden="true"
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2.5"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    width="18"
                    height="18"
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </span>
              </button>
              <p class="m-survey__hint">可多选</p>
            </div>

            <!-- 开放文本 -->
            <div v-else-if="currentItem?.itemType === 'OPEN_TEXT'" class="m-survey__open">
              <textarea
                v-model="openTexts[currentItem.itemToken]"
                class="m-survey__textarea"
                rows="5"
                placeholder="请输入您的回答…"
                maxlength="2000"
              />
              <div class="m-survey__char-count">
                {{ (openTexts[currentItem.itemToken] || '').length }} / 2000
              </div>
            </div>
          </div>
        </transition>

        <div class="m-survey__nav">
          <button class="m-survey__btn m-survey__btn--ghost" @click="goPrev">
            {{ currentIndex === 0 ? '返回' : '上一题' }}
          </button>
          <button
            v-if="currentIndex < totalCount - 1"
            class="m-survey__btn m-survey__btn--primary"
            @click="goNext"
          >
            下一题
          </button>
          <button
            v-else
            class="m-survey__btn m-survey__btn--submit"
            :disabled="submitting"
            @click="handleSubmit"
          >
            {{ submitting ? '提交中…' : '提交问卷' }}
          </button>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import type { PublicSurveyItemVO } from '@/apis/public-survey'
import { message } from 'ant-design-vue'
import { computed, ref } from 'vue'
import { useSurveyFill } from '@/composables/useSurveyFill'
import { strictEnumLabel } from '@/utils/strict-enum'

const PUBLIC_SURVEY_ITEM_TYPE_LABEL: Record<PublicSurveyItemVO['itemType'], string> = {
  SCALE: '量表题',
  SINGLE_CHOICE: '单选题',
  MULTI_CHOICE: '多选题',
  OPEN_TEXT: '填空题',
}

const {
  loading,
  errorMessage,
  survey,
  submitted,
  submitting,
  thankYouMessage,
  identityValues,
  scaleAnswers,
  singleChoiceAnswers,
  multiAnswers,
  openTexts,
  totalCount,
  progressPercent,
  isItemAnswered,
  getScaleOptions,
  choiceOptionsOf,
  hasRequiredIdentityFilled,
  submitSurvey,
  loadSurvey,
} = useSurveyFill()

type Step = 'cover' | 'identity' | 'question'
type AnswerCardHeightMode = 'half' | 'full'

const currentStep = ref<Step>('cover')
const currentIndex = ref(0)
const slideDirection = ref<'slide-left' | 'slide-right'>('slide-left')
const answerCardHeight = ref<AnswerCardHeightMode>('half')

const currentItem = computed(() => survey.value?.items[currentIndex.value] ?? null)
const scaleOptions = computed(() => (currentItem.value ? getScaleOptions(currentItem.value) : []))
const choiceOptions = computed(() => (currentItem.value ? choiceOptionsOf(currentItem.value) : []))

function startSurvey() {
  if (survey.value && !survey.value.allowAnonymous) {
    currentStep.value = 'identity'
  } else {
    goToQuestion(0)
  }
}

function goToQuestion(index: number) {
  currentIndex.value = index
  currentStep.value = 'question'
}

function goPrev() {
  if (currentIndex.value === 0) {
    currentStep.value = survey.value && !survey.value.allowAnonymous ? 'identity' : 'cover'
    return
  }
  slideDirection.value = 'slide-right'
  currentIndex.value--
}

function goNext() {
  const item = currentItem.value
  if (item && item.required && !isItemAnswered(item)) {
    message.warning('此题为必填项，请作答后继续')
    return
  }
  slideDirection.value = 'slide-left'
  currentIndex.value++
}

function toggleMulti(itemId: string, opt: string) {
  if (!multiAnswers[itemId]) {
    multiAnswers[itemId] = []
  }
  const idx = multiAnswers[itemId].indexOf(opt)
  if (idx >= 0) {
    multiAnswers[itemId].splice(idx, 1)
  } else {
    multiAnswers[itemId].push(opt)
  }
}

function itemTypeLabel(type: PublicSurveyItemVO['itemType']): string {
  return strictEnumLabel(PUBLIC_SURVEY_ITEM_TYPE_LABEL, type, '公开问卷题型')
}

async function handleSubmit() {
  const item = currentItem.value
  if (item && item.required && !isItemAnswered(item)) {
    message.warning('此题为必填项，请作答后继续')
    return
  }
  await submitSurvey()
}
</script>

<style scoped lang="scss">
/* ============================================================
   移动端问卷 — 一题一页模式
   参考问卷星移动端设计语言
   ============================================================ */
.m-survey {
  --survey-page-bg: var(--ant-color-bg-layout, #f5f5f5);
  --survey-border: var(--ant-color-border-secondary, #e8e8e8);
  --survey-border-light: var(--ant-color-border-secondary, #f0f0f0);
  --survey-surface: var(--ant-color-bg-container, #fff);
  --survey-surface-muted: var(--ant-color-fill-quaternary, #f7f8fc);
  --survey-text: var(--dp-text-primary, #1a1a2e);
  --survey-text-secondary: var(--dp-text-secondary, #666);
  --survey-text-muted: var(--dp-text-tertiary, #999);
  --survey-text-placeholder: var(--ant-color-text-quaternary, #bbb);
  --survey-warning-bg: var(--ant-color-warning-bg, #fff3e0);
  --survey-warning-text: var(--ant-color-warning, #f57c00);
  --survey-success-bg: var(--ant-color-success-bg, #e8f5e9);
  --survey-success-text: var(--ant-color-success, #43a047);
  --survey-danger: var(--ant-color-error, #ff4d4f);
  --survey-on-primary: var(--ant-color-text-light-solid, #fff);

  min-height: 100vh;
  min-height: 100dvh;
  background: var(--survey-page-bg);
  font-family:
    -apple-system, BlinkMacSystemFont, 'PingFang SC', 'Helvetica Neue', 'Microsoft YaHei',
    sans-serif;
  -webkit-font-smoothing: antialiased;
  overflow-x: hidden;
}

/* --- 状态页（加载/错误/成功） --- */
.m-survey__status {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  min-height: 100dvh;
  padding: 32px 24px;
  text-align: center;
}

.m-survey__spinner {
  width: 40px;
  height: 40px;
  border: 3px solid var(--survey-border);
  border-top-color: var(--ant-color-primary, #1677ff);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.m-survey__icon {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28px;
  font-weight: 700;
  margin-bottom: 20px;
}

.m-survey__icon--warn {
  background: var(--survey-warning-bg);
  color: var(--survey-warning-text);
}

.m-survey__icon--success {
  background: var(--survey-success-bg);
  color: var(--survey-success-text);

  svg {
    width: 32px;
    height: 32px;
  }
}

.m-survey__status-title {
  font-size: 20px;
  font-weight: 600;
  color: var(--survey-text);
  margin: 0 0 8px;
}

.m-survey__status-text {
  font-size: 14px;
  color: var(--survey-text-secondary);
  margin: 8px 0 0;
}

.m-survey__status-hint {
  font-size: 13px;
  color: var(--survey-text-muted);
  margin-top: 12px;
}

/* --- 封面页 --- */
.m-survey__cover {
  min-height: 100vh;
  min-height: 100dvh;
  display: flex;
  flex-direction: column;
  background: var(--ant-color-bg-container, #fff);
}

.m-survey__cover-header {
  padding: 48px 24px 0;
  text-align: center;
}

.m-survey__cover-badge {
  display: inline-block;
  padding: 4px 16px;
  background: var(--ant-color-primary-bg, #e6f4ff);
  border-radius: 20px;
  color: var(--ant-color-primary, #1677ff);
  font-size: 13px;
  font-weight: 500;
  letter-spacing: 2px;
}

.m-survey__cover-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 32px 28px;
  text-align: center;
}

.m-survey__cover-title {
  font-size: 26px;
  font-weight: 700;
  color: var(--dp-text-primary, #1a1a2e);
  line-height: 1.4;
  margin: 0 0 16px;
}

.m-survey__cover-desc {
  font-size: 15px;
  color: var(--dp-text-secondary, #666);
  line-height: 1.6;
  margin: 0 0 12px;
  max-width: 320px;
}

.m-survey__cover-welcome {
  font-size: 14px;
  color: var(--dp-text-secondary, #666);
  line-height: 1.5;
  margin: 0 0 20px;
  max-width: 300px;
  font-style: italic;
}

.m-survey__cover-meta {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: var(--dp-text-tertiary, #999);
  margin-bottom: 8px;

  svg {
    opacity: 0.7;
  }
}

.m-survey__cover-info {
  font-size: 13px;
  color: var(--dp-text-tertiary, #999);
}

.m-survey__cover-action {
  padding: 24px 28px 48px;
  text-align: center;
}

/* --- 页面容器 --- */
.m-survey__page {
  min-height: 100vh;
  min-height: 100dvh;
  display: flex;
  flex-direction: column;
  background: var(--survey-surface-muted);
}

.m-survey__page-body {
  flex: 1;
  padding: 24px 20px 100px;
}

.m-survey__page-title {
  font-size: 20px;
  font-weight: 600;
  color: var(--survey-text);
  margin: 16px 0 6px;
  text-align: center;
}

.m-survey__page-subtitle {
  font-size: 14px;
  color: var(--survey-text-secondary);
  text-align: center;
  margin: 0 0 28px;
}

/* --- 进度条 --- */
.m-survey__progress {
  position: sticky;
  top: 0;
  z-index: 10;
  height: 4px;
  background: var(--survey-border);
}

.m-survey__height-toggle {
  position: absolute;
  left: 12px;
  top: 10px;
  display: inline-flex;
  gap: 4px;
  padding: 2px;
  background: rgba(255, 255, 255, 0.92);
  border: 1px solid var(--survey-border);
  border-radius: 999px;
}

.m-survey__height-btn {
  border: none;
  background: transparent;
  color: var(--survey-text-secondary);
  font-size: 11px;
  line-height: 1;
  padding: 6px 10px;
  border-radius: 999px;
  cursor: pointer;
}

.m-survey__height-btn--active {
  background: var(--ant-color-primary, #1677ff);
  color: var(--survey-on-primary);
}

.m-survey__page--half .m-survey__page-body {
  min-height: calc(50dvh - 72px);
}

.m-survey__page--full .m-survey__page-body {
  min-height: calc(100dvh - 72px);
}

.m-survey__progress-bar {
  height: 100%;
  background: var(--ant-color-primary, #1677ff);
  border-radius: 0 2px 2px 0;
  transition: width 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}

.m-survey__progress-text {
  position: absolute;
  right: 12px;
  top: 10px;
  font-size: 12px;
  color: var(--survey-text-muted);
  font-weight: 500;
}

/* --- 身份表单 --- */
.m-survey__identity-icon {
  text-align: center;
  color: var(--ant-color-primary, #1677ff);
  margin-top: 40px;
}

.m-survey__field {
  margin-bottom: 20px;
}

.m-survey__field-label {
  display: block;
  font-size: 14px;
  font-weight: 500;
  color: var(--survey-text);
  margin-bottom: 8px;
}

.m-survey__input {
  width: 100%;
  height: 48px;
  padding: 0 16px;
  border: 1.5px solid var(--survey-border);
  border-radius: 12px;
  font-size: 16px;
  color: var(--survey-text);
  background: var(--survey-surface);
  outline: none;
  transition: border-color 0.2s;
  box-sizing: border-box;
  -webkit-appearance: none;

  &:focus {
    border-color: var(--ant-color-primary, #1677ff);
    box-shadow: 0 0 0 3px rgba(22, 119, 255, 0.12);
  }

  &::placeholder {
  color: var(--survey-text-placeholder);
  }
}

/* --- 题目区 --- */
.m-survey__question {
  padding-top: 32px;
}

.m-survey__q-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;
}

.m-survey__q-index {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 36px;
  height: 28px;
  padding: 0 8px;
  background: var(--ant-color-primary, #1677ff);
  color: var(--survey-on-primary);
  font-size: 13px;
  font-weight: 700;
  border-radius: 14px;
}

.m-survey__required {
  font-size: 12px;
  color: var(--survey-on-primary);
  background: var(--survey-danger);
  padding: 2px 8px;
  border-radius: 10px;
  font-weight: 500;
}

.m-survey__q-type {
  font-size: 12px;
  color: var(--survey-text-muted);
  margin-left: auto;
}

.m-survey__q-text {
  font-size: 18px;
  font-weight: 600;
  color: var(--survey-text);
  line-height: 1.6;
  margin: 0 0 28px;
}

/* --- 量表题 --- */
.m-survey__scale {
  margin-top: 8px;
}

.m-survey__scale-labels {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  color: var(--survey-text-muted);
  margin-bottom: 12px;
  padding: 0 4px;
}

.m-survey__scale-btns {
  display: flex;
  gap: 8px;
  justify-content: center;
}

.m-survey__scale-btn {
  width: 52px;
  height: 52px;
  border: 2px solid var(--survey-border);
  border-radius: 14px;
  background: var(--survey-surface);
  font-size: 18px;
  font-weight: 600;
  color: var(--survey-text);
  cursor: pointer;
  transition: all 0.2s;
  -webkit-tap-highlight-color: transparent;

  &:active {
    transform: scale(0.95);
  }
}

.m-survey__scale-btn--active {
  border-color: var(--ant-color-primary, #1677ff);
  background: var(--ant-color-primary, #1677ff);
  color: var(--survey-on-primary);
  box-shadow: 0 4px 12px rgba(22, 119, 255, 0.25);
  transform: scale(1.05);
}

/* --- 选择题 --- */
.m-survey__choices {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.m-survey__choice {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  border: 1.5px solid #e8e8e8;
  border-radius: 12px;
  background: var(--survey-surface);
  font-size: 15px;
  color: var(--survey-text);
  cursor: pointer;
  transition: all 0.2s;
  text-align: left;
  -webkit-tap-highlight-color: transparent;
  width: 100%;

  &:active {
    transform: scale(0.98);
  }
}

.m-survey__choice--active {
  border-color: var(--ant-color-primary, #1677ff);
  background: var(--ant-color-primary-bg, #e6f4ff);
  color: var(--ant-color-primary, #1677ff);

  .m-survey__choice-letter {
    background: var(--ant-color-primary, #1677ff);
    color: var(--survey-on-primary);
    border-color: transparent;
  }
}

.m-survey__choice-letter {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 8px;
  border: 1.5px solid var(--ant-color-border, #d0d0d0);
  font-size: 13px;
  font-weight: 600;
  color: var(--survey-text-secondary);
  flex-shrink: 0;
  transition: all 0.2s;
}

.m-survey__choice-text {
  flex: 1;
  line-height: 1.4;
}

.m-survey__choice-check {
  font-size: 16px;
  color: var(--ant-color-primary, #1677ff);
  font-weight: 700;
}

.m-survey__hint {
  font-size: 12px;
  color: var(--survey-text-muted);
  text-align: center;
  margin: 4px 0 0;
}

/* --- 开放文本 --- */
.m-survey__open {
  position: relative;
}

.m-survey__textarea {
  width: 100%;
  padding: 16px;
  border: 1.5px solid var(--survey-border);
  border-radius: 12px;
  font-size: 16px;
  color: var(--survey-text);
  background: var(--survey-surface);
  outline: none;
  resize: vertical;
  min-height: 120px;
  box-sizing: border-box;
  font-family: inherit;
  -webkit-appearance: none;

  &:focus {
    border-color: var(--ant-color-primary, #1677ff);
    box-shadow: 0 0 0 3px rgba(22, 119, 255, 0.12);
  }

  &::placeholder {
  color: var(--survey-text-placeholder);
  }
}

.m-survey__char-count {
  text-align: right;
  font-size: 12px;
  color: var(--survey-text-placeholder);
  margin-top: 6px;
}

/* --- 底部导航 --- */
.m-survey__nav {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  display: flex;
  gap: 12px;
  padding: 12px 20px;
  padding-bottom: calc(12px + env(safe-area-inset-bottom, 0px));
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(8px);
  border-top: 1px solid var(--survey-border-light);
  z-index: 20;
}

/* --- 按钮 --- */
.m-survey__btn {
  flex: 1;
  height: 48px;
  border: none;
  border-radius: 12px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  -webkit-tap-highlight-color: transparent;

  &:active {
    transform: scale(0.97);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
}

.m-survey__btn--primary {
  background: var(--ant-color-primary, #1677ff);
  color: var(--survey-on-primary);
  box-shadow: 0 4px 14px rgba(22, 119, 255, 0.25);
}

.m-survey__btn--submit {
  background: var(--ant-color-success, #52c41a);
  color: var(--survey-on-primary);
  box-shadow: 0 4px 14px rgba(82, 196, 26, 0.25);
}

.m-survey__btn--ghost {
  background: var(--ant-color-fill-tertiary, #f5f5f5);
  color: var(--survey-text-secondary);
}

.m-survey__btn--retry {
  margin-top: 16px;
  padding: 0 24px;
  height: 44px;
  border: none;
  border-radius: 22px;
  background: var(--ant-color-primary, #1677ff);
  color: #fff;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
}

.m-survey__btn--lg {
  height: 52px;
  font-size: 17px;
  border-radius: 26px;
  width: 100%;
  max-width: 280px;
  margin: 0 auto;
  display: block;
}

/* --- 切题动画 --- */
.slide-left-enter-active,
.slide-left-leave-active,
.slide-right-enter-active,
.slide-right-leave-active {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.slide-left-enter-from {
  opacity: 0;
  transform: translateX(40px);
}

.slide-left-leave-to {
  opacity: 0;
  transform: translateX(-40px);
}

.slide-right-enter-from {
  opacity: 0;
  transform: translateX(-40px);
}

.slide-right-leave-to {
  opacity: 0;
  transform: translateX(40px);
}
</style>
