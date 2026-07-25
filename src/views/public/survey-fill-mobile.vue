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
          <div class="m-survey__progress-bar" :style="{ transform: 'scaleX(0)' }" />
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
          <div
            class="m-survey__progress-bar"
            :style="{
              transform: `scaleX(${Math.max(0, Math.min(Number(progressPercent), 100)) / 100})`,
            }"
          />
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
            <div
              v-if="currentItem?.itemType === IndirectEvaluationItemTypeCode.SCALE"
              class="m-survey__scale"
            >
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
            <div
              v-else-if="currentItem?.itemType === IndirectEvaluationItemTypeCode.SINGLE_CHOICE"
              class="m-survey__choices"
            >
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
            <div
              v-else-if="currentItem?.itemType === IndirectEvaluationItemTypeCode.MULTI_CHOICE"
              class="m-survey__choices"
            >
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
            <div
              v-else-if="currentItem?.itemType === IndirectEvaluationItemTypeCode.OPEN_TEXT"
              class="m-survey__open"
            >
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
import message from 'ant-design-vue/es/message'
import { computed, ref } from 'vue'
import { formatPublicSurveyItemType } from '@/apis/public-survey'
import { useSurveyFill } from '@/composables/useSurveyFill'
import { IndirectEvaluationItemTypeCode } from '@/types/enums/indirect-evaluation-item-type-enum'

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
    void message.warning('此题为必填项，请作答后继续')
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

function itemTypeLabel(type: IndirectEvaluationItemTypeCode): string {
  return formatPublicSurveyItemType(type)
}

async function handleSubmit() {
  const item = currentItem.value
  if (item && item.required && !isItemAnswered(item)) {
    void message.warning('此题为必填项，请作答后继续')
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
  --survey-page-bg: var(--dp-bg-muted);
  --survey-border: var(--dp-border-subtle);
  --survey-border-light: var(--dp-border-subtle);
  --survey-surface: var(--dp-surface);
  --survey-surface-muted: var(--dp-fill-quaternary);
  --survey-text: var(--dp-text-primary);
  --survey-text-secondary: var(--dp-text-secondary);
  --survey-text-muted: var(--dp-text-muted);
  --survey-text-placeholder: var(--dp-text-quaternary);
  --survey-warning-bg: var(--dp-warning-bg);
  --survey-warning-text: var(--dp-warning);
  --survey-success-bg: var(--dp-success-bg);
  --survey-success-text: var(--dp-success);
  --survey-danger: var(--dp-error);
  --survey-on-primary: var(--dp-text-inverse);
  --survey-primary: var(--dp-color-primary);
  --survey-primary-bg: var(--dp-color-primary-bg);
  --survey-primary-border: var(--dp-color-primary-border);

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
  padding: var(--dp-space-page) var(--dp-space-block);
  text-align: center;
}

.m-survey__spinner {
  width: 40px;
  height: 40px;
  border: 3px solid var(--survey-border);
  border-top-color: var(--survey-primary);
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
  margin-bottom: var(--dp-space-component);
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
  font-size: var(--dp-font-size-2xl);
  font-weight: 600;
  color: var(--survey-text);
  margin: 0 0 var(--dp-space-component-tight);
}

.m-survey__status-text {
  font-size: var(--dp-font-size-md);
  color: var(--survey-text-secondary);
  margin: var(--dp-space-component-tight) 0 0;
}

.m-survey__status-hint {
  font-size: var(--dp-font-size-sm);
  color: var(--survey-text-muted);
  margin-top: var(--dp-space-component);
}

/* --- 封面页 --- */
.m-survey__cover {
  min-height: 100vh;
  min-height: 100dvh;
  display: flex;
  flex-direction: column;
  background: var(--survey-surface);
}

.m-survey__cover-header {
  padding: var(--dp-space-page) var(--dp-space-block) 0;
  text-align: center;
}

.m-survey__cover-badge {
  display: inline-block;
  padding: var(--dp-space-component-xs) var(--dp-space-block);
  background: var(--survey-primary-bg);
  border-radius: 20px;
  color: var(--survey-primary);
  font-size: var(--dp-font-size-sm);
  font-weight: 500;
  letter-spacing: 2px;
}

.m-survey__cover-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--dp-space-page) var(--dp-space-block);
  text-align: center;
}

.m-survey__cover-title {
  font-size: 26px;
  font-weight: 700;
  color: var(--dp-text-primary);
  line-height: 1.4;
  margin: 0 0 var(--dp-space-block);
}

.m-survey__cover-desc {
  font-size: 15px;
  color: var(--dp-text-secondary);
  line-height: 1.6;
  margin: 0 0 var(--dp-space-component);
  max-width: 320px;
}

.m-survey__cover-welcome {
  font-size: var(--dp-font-size-md);
  color: var(--dp-text-secondary);
  line-height: 1.5;
  margin: 0 0 var(--dp-space-block);
  max-width: 300px;
  font-style: italic;
}

.m-survey__cover-meta {
  display: flex;
  align-items: center;
  gap: var(--dp-space-component-tight);
  font-size: var(--dp-font-size-sm);
  color: var(--dp-text-muted);
  margin-bottom: var(--dp-space-component-tight);

  svg {
    opacity: 0.7;
  }
}

.m-survey__cover-info {
  font-size: var(--dp-font-size-sm);
  color: var(--dp-text-muted);
}

.m-survey__cover-action {
  padding: var(--dp-space-block) var(--dp-space-section);
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
  padding: var(--dp-space-component) var(--dp-space-block) 88px;
}

.m-survey__page-title {
  font-size: var(--dp-font-size-2xl);
  font-weight: 600;
  color: var(--survey-text);
  margin: var(--dp-space-block) 0 var(--dp-space-component-tight);
  text-align: center;
}

.m-survey__page-subtitle {
  font-size: var(--dp-font-size-md);
  color: var(--survey-text-secondary);
  text-align: center;
  margin: 0 0 var(--dp-space-page);
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
  gap: var(--dp-space-component-xs);
  padding: 2px;
  background: rgba(255, 255, 255, 0.92);
  border: 1px solid var(--survey-border);
  border-radius: var(--dp-radius-full);
}

.m-survey__height-btn {
  border: none;
  background: transparent;
  color: var(--survey-text-secondary);
  font-size: var(--dp-font-size-xxs);
  line-height: 1;
  padding: var(--dp-space-component-tight) var(--dp-space-component);
  border-radius: var(--dp-radius-full);
  cursor: pointer;
}

.m-survey__height-btn--active {
  background: var(--survey-primary);
  color: var(--survey-on-primary);
}

.m-survey__page--half .m-survey__page-body {
  min-height: calc(50dvh - 72px);
}

.m-survey__page--full .m-survey__page-body {
  min-height: calc(100dvh - 72px);
}

.m-survey__progress-bar {
  width: 100%;
  height: 100%;
  transform-origin: left center;
  background: var(--survey-primary);
  border-radius: 3px;
  transition: transform var(--dp-duration-page) cubic-bezier(0.4, 0, 0.2, 1);
}

.m-survey__progress-text {
  position: absolute;
  right: 12px;
  top: 10px;
  font-size: var(--dp-font-size-xs);
  color: var(--survey-text-muted);
  font-weight: 500;
}

/* --- 身份表单 --- */
.m-survey__identity-icon {
  text-align: center;
  color: var(--survey-primary);
  margin-top: var(--dp-space-block);
}

.m-survey__field {
  margin-bottom: var(--dp-space-block);
}

.m-survey__field-label {
  display: block;
  font-size: var(--dp-font-size-md);
  font-weight: 500;
  color: var(--survey-text);
  margin-bottom: var(--dp-space-component-tight);
}

.m-survey__input {
  width: 100%;
  height: 48px;
  padding: 0 var(--dp-space-block);
  border: 1.5px solid var(--survey-border);
  border-radius: 12px;
  font-size: var(--dp-font-size-lg);
  color: var(--survey-text);
  background: var(--survey-surface);
  outline: none;
  transition: border-color var(--dp-duration-normal);
  box-sizing: border-box;
  -webkit-appearance: none;

  &:focus {
    border-color: var(--survey-primary);
    box-shadow: 0 0 0 3px var(--dp-focus-ring);
  }

  &::placeholder {
    color: var(--survey-text-placeholder);
  }
}

/* --- 题目区 --- */
.m-survey__question {
  padding-top: var(--dp-space-section);
}

.m-survey__q-header {
  display: flex;
  align-items: center;
  gap: var(--dp-space-component-tight);
  margin-bottom: var(--dp-space-block);
}

.m-survey__q-index {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 36px;
  height: 28px;
  padding: 0 var(--dp-space-component-tight);
  background: var(--survey-primary);
  color: var(--survey-on-primary);
  font-size: var(--dp-font-size-sm);
  font-weight: 700;
  border-radius: 14px;
}

.m-survey__required {
  font-size: var(--dp-font-size-xs);
  color: var(--survey-on-primary);
  background: var(--survey-danger);
  padding: 2px var(--dp-space-component-tight);
  border-radius: 10px;
  font-weight: 500;
}

.m-survey__q-type {
  font-size: var(--dp-font-size-xs);
  color: var(--survey-text-muted);
  margin-left: auto;
}

.m-survey__q-text {
  font-size: var(--dp-font-size-xl);
  font-weight: 600;
  color: var(--survey-text);
  line-height: 1.6;
  margin: 0 0 var(--dp-space-page);
}

/* --- 量表题 --- */
.m-survey__scale {
  margin-top: var(--dp-space-component-tight);
}

.m-survey__scale-labels {
  display: flex;
  justify-content: space-between;
  font-size: var(--dp-font-size-xs);
  color: var(--survey-text-muted);
  margin-bottom: var(--dp-space-component);
  padding: 0 var(--dp-space-component-xs);
}

.m-survey__scale-btns {
  display: flex;
  gap: var(--dp-space-component-tight);
  justify-content: center;
}

.m-survey__scale-btn {
  width: 52px;
  height: 52px;
  border: 2px solid var(--survey-border);
  border-radius: 14px;
  background: var(--survey-surface);
  font-size: var(--dp-font-size-xl);
  font-weight: 600;
  color: var(--survey-text);
  cursor: pointer;
  transition: all var(--dp-duration-normal);
  -webkit-tap-highlight-color: transparent;

  &:active {
    transform: scale(0.95);
  }
}

.m-survey__scale-btn--active {
  border-color: var(--survey-primary);
  background: var(--survey-primary);
  color: var(--survey-on-primary);
  box-shadow: var(--dp-shadow-sm);
  transform: scale(1.05);
}

/* --- 选择题 --- */
.m-survey__choices {
  display: flex;
  flex-direction: column;
  gap: var(--dp-space-component);
}

.m-survey__choice {
  display: flex;
  align-items: center;
  gap: var(--dp-space-component);
  padding: var(--dp-space-block);
  border: 1.5px solid var(--survey-border);
  border-radius: 12px;
  background: var(--survey-surface);
  font-size: 15px;
  color: var(--survey-text);
  cursor: pointer;
  transition: all var(--dp-duration-normal);
  text-align: left;
  -webkit-tap-highlight-color: transparent;
  width: 100%;

  &:active {
    transform: scale(0.98);
  }
}

.m-survey__choice--active {
  border-color: var(--survey-primary);
  background: var(--survey-primary-bg);
  color: var(--survey-primary);

  .m-survey__choice-letter {
    background: var(--survey-primary);
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
  border-radius: var(--dp-radius-panel);
  border: 1.5px solid var(--survey-border);
  font-size: var(--dp-font-size-sm);
  font-weight: 600;
  color: var(--survey-text-secondary);
  flex-shrink: 0;
  transition: all var(--dp-duration-normal);
}

.m-survey__choice-text {
  flex: 1;
  line-height: 1.4;
}

.m-survey__choice-check {
  font-size: var(--dp-font-size-lg);
  color: var(--survey-primary);
  font-weight: 700;
}

.m-survey__hint {
  font-size: var(--dp-font-size-xs);
  color: var(--survey-text-muted);
  text-align: center;
  margin: var(--dp-space-component-xs) 0 0;
}

/* --- 开放文本 --- */
.m-survey__open {
  position: relative;
}

.m-survey__textarea {
  width: 100%;
  padding: var(--dp-space-component);
  border: 1.5px solid var(--survey-border);
  border-radius: var(--dp-radius-panel);
  font-size: var(--dp-font-size-lg);
  color: var(--survey-text);
  background: var(--survey-surface);
  outline: none;
  resize: vertical;
  min-height: 120px;
  box-sizing: border-box;
  font-family: inherit;
  -webkit-appearance: none;

  &:focus {
    border-color: var(--survey-primary);
    box-shadow: 0 0 0 3px var(--dp-focus-ring);
  }

  &::placeholder {
    color: var(--survey-text-placeholder);
  }
}

.m-survey__char-count {
  text-align: right;
  font-size: var(--dp-font-size-xs);
  color: var(--survey-text-placeholder);
  margin-top: var(--dp-space-component-tight);
}

/* --- 底部导航 --- */
.m-survey__nav {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  display: flex;
  gap: var(--dp-space-component);
  padding: var(--dp-space-component) var(--dp-space-block);
  padding-bottom: calc(var(--dp-space-component) + env(safe-area-inset-bottom, 0px));
  background: var(--survey-surface);
  border-top: 1px solid var(--survey-border-light);
  z-index: 20;
}

/* --- 按钮 --- */
.m-survey__btn {
  flex: 1;
  height: 48px;
  border: none;
  border-radius: 12px;
  font-size: var(--dp-font-size-lg);
  font-weight: 600;
  cursor: pointer;
  transition: all var(--dp-duration-normal);
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
  background: var(--survey-primary);
  color: var(--survey-on-primary);
  box-shadow: var(--dp-shadow-sm);
}

.m-survey__btn--submit {
  background: var(--dp-success);
  color: var(--survey-on-primary);
  box-shadow: var(--dp-shadow-sm);
}

.m-survey__btn--ghost {
  background: var(--survey-surface-muted);
  color: var(--survey-text-secondary);
}

.m-survey__btn--retry {
  margin-top: var(--dp-space-block);
  padding: 0 var(--dp-space-page);
  height: 44px;
  border: none;
  border-radius: 22px;
  background: var(--survey-primary);
  color: var(--survey-on-primary);
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
  transition: all var(--dp-duration-slow) cubic-bezier(0.4, 0, 0.2, 1);
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
