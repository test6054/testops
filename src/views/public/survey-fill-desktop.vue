<template>
  <div class="d-survey">
    <!-- 加载 -->
    <div v-if="loading" class="d-survey__status">
      <div class="d-survey__spinner" />
      <p class="d-survey__status-text">正在加载问卷…</p>
    </div>

    <!-- 错误 -->
    <div v-else-if="errorMessage" class="d-survey__status">
      <div class="d-survey__icon d-survey__icon--warn">!</div>
      <p class="d-survey__status-title">无法加载问卷</p>
      <p class="d-survey__status-text">{{ errorMessage }}</p>
      <p class="d-survey__status-hint">请检查链接是否正确，或联系问卷发布者</p>
    </div>

    <!-- 提交成功 -->
    <div v-else-if="submitted" class="d-survey__status d-survey__status--success">
      <div class="d-survey__icon d-survey__icon--success">
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
      <p class="d-survey__status-title">{{ thankYouMessage }}</p>
      <p class="d-survey__status-text">您的回答已成功提交，感谢参与！</p>
    </div>

    <!-- 问卷主体 -->
    <template v-else-if="survey">
      <!-- 顶部横幅 -->
      <div class="d-survey__banner">
        <div class="d-survey__banner-inner">
          <div class="d-survey__banner-badge">问卷调查</div>
          <h1 class="d-survey__banner-title">{{ survey.formName }}</h1>
          <p v-if="survey.description" class="d-survey__banner-desc">{{ survey.description }}</p>
        </div>
      </div>

      <!-- 粘性进度条 -->
      <div class="d-survey__progress-wrap">
        <div class="d-survey__progress">
          <div class="d-survey__progress-bar" :style="{ width: `${progressPercent}%` }" />
        </div>
        <span class="d-survey__progress-label">已完成 {{ answeredCount }}/{{ totalCount }} 题（{{ progressPercent }}%）</span>
      </div>

      <!-- 内容区 -->
      <div class="d-survey__body">
        <div class="d-survey__container">
          <!-- 欢迎语 -->
          <div v-if="survey.welcomeMessage" class="d-survey__welcome">
            <p>{{ survey.welcomeMessage }}</p>
          </div>

          <!-- 截止时间 -->
          <div v-if="survey.endTime" class="d-survey__meta">
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

          <!-- 身份信息 -->
          <div v-if="!survey.allowAnonymous" class="d-survey__identity">
            <div class="d-survey__identity-header">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                width="18"
                height="18"
              >
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
              <span>填写人信息</span>
            </div>
            <div class="d-survey__identity-fields">
              <div
                v-for="field in survey.identityFields"
                :key="field.fieldKey"
                class="d-survey__field"
              >
                <label class="d-survey__field-label">
                  {{ field.fieldLabel }}
                  <span v-if="field.required" class="d-survey__required-dot">*</span>
                </label>
                <input
                  v-model="identityValues[field.fieldKey]"
                  type="text"
                  class="d-survey__input"
                  :placeholder="`请输入${field.fieldLabel}`"
                  maxlength="200"
                />
              </div>
            </div>
          </div>

          <!-- 题目列表 -->
          <div
            v-for="(item, index) in survey.items"
            :key="item.itemToken"
            :ref="bindItemRef(index)"
            class="d-survey__item"
            :class="{
              'd-survey__item--answered': isItemAnswered(item),
              'd-survey__item--shake': shakingIndex === index,
            }"
          >
            <div class="d-survey__item-sidebar">
              <div
                class="d-survey__item-dot"
                :class="{
                  'd-survey__item-dot--done': isItemAnswered(item),
                  'd-survey__item-dot--req': item.required && !isItemAnswered(item),
                }"
              >
                <svg
                  v-if="isItemAnswered(item)"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2.5"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  width="14"
                  height="14"
                  aria-hidden="true"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                <template v-else>{{ index + 1 }}</template>
              </div>
            </div>

            <div class="d-survey__item-main">
              <div class="d-survey__item-header">
                <span class="d-survey__item-text">{{ item.itemText }}</span>
                <span v-if="item.required" class="d-survey__required-tag">必填</span>
                <span class="d-survey__item-type">{{ itemTypeLabel(item.itemType) }}</span>
              </div>

              <!-- 量表题 -->
              <div
                v-if="item.itemType === IndirectEvaluationItemTypeCode.SCALE"
                class="d-survey__scale"
              >
                <div class="d-survey__scale-labels">
                  <span>{{ getScaleOptions(item)[0]?.label || '' }}</span>
                  <span>{{ getScaleOptions(item).at(-1)?.label || '' }}</span>
                </div>
                <div class="d-survey__scale-btns">
                  <button
                    v-for="opt in getScaleOptions(item)"
                    :key="opt.value"
                    class="d-survey__scale-btn"
                    :class="{
                      'd-survey__scale-btn--active': scaleAnswers[item.itemToken] === opt.value,
                    }"
                    @click="scaleAnswers[item.itemToken] = opt.value"
                  >
                    {{ opt.value }}
                  </button>
                </div>
              </div>

              <!-- 单选题 -->
              <div
                v-else-if="item.itemType === IndirectEvaluationItemTypeCode.SINGLE_CHOICE"
                class="d-survey__choices"
              >
                <button
                  v-for="(opt, oi) in choiceOptionsOf(item)"
                  :key="opt.optionValue"
                  class="d-survey__choice"
                  :class="{
                    'd-survey__choice--active':
                      singleChoiceAnswers[item.itemToken] === opt.optionValue,
                  }"
                  @click="singleChoiceAnswers[item.itemToken] = opt.optionValue"
                >
                  <span class="d-survey__choice-letter">{{ String.fromCharCode(65 + oi) }}</span>
                  <span class="d-survey__choice-text">{{ opt.optionLabel }}</span>
                  <span
                    v-if="singleChoiceAnswers[item.itemToken] === opt.optionValue"
                    class="d-survey__choice-check"
                    aria-hidden="true"
                  >
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2.5"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      width="16"
                      height="16"
                    >
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </span>
                </button>
              </div>

              <!-- 多选题 -->
              <div
                v-else-if="item.itemType === IndirectEvaluationItemTypeCode.MULTI_CHOICE"
                class="d-survey__choices"
              >
                <button
                  v-for="(opt, oi) in choiceOptionsOf(item)"
                  :key="opt.optionValue"
                  class="d-survey__choice"
                  :class="{
                    'd-survey__choice--active': (multiAnswers[item.itemToken] || []).includes(
                      opt.optionValue,
                    ),
                  }"
                  @click="toggleMulti(item.itemToken, opt.optionValue)"
                >
                  <span class="d-survey__choice-letter">{{ String.fromCharCode(65 + oi) }}</span>
                  <span class="d-survey__choice-text">{{ opt.optionLabel }}</span>
                  <span
                    v-if="(multiAnswers[item.itemToken] || []).includes(opt.optionValue)"
                    class="d-survey__choice-check"
                    aria-hidden="true"
                  >
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2.5"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      width="16"
                      height="16"
                    >
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </span>
                </button>
                <p class="d-survey__hint">可多选</p>
              </div>

              <!-- 开放文本 -->
              <div
                v-else-if="item.itemType === IndirectEvaluationItemTypeCode.OPEN_TEXT"
                class="d-survey__open"
              >
                <textarea
                  v-model="openTexts[item.itemToken]"
                  class="d-survey__textarea"
                  rows="4"
                  placeholder="请输入您的回答…"
                  maxlength="2000"
                />
                <div class="d-survey__char-count">
                  {{ (openTexts[item.itemToken] || '').length }} / 2000
                </div>
              </div>
            </div>
          </div>

          <!-- 提交 -->
          <div class="d-survey__submit">
            <button
              class="d-survey__btn d-survey__btn--submit"
              :disabled="submitting"
              @click="handleSubmit"
            >
              {{ submitting ? '提交中…' : '提交问卷' }}
            </button>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import type { ComponentPublicInstance } from 'vue'
import { nextTick, ref } from 'vue'
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
  answeredCount,
  progressPercent,
  isItemAnswered,
  getScaleOptions,
  choiceOptionsOf,
  findFirstUnansweredRequired,
  submitSurvey,
  loadSurvey,
} = useSurveyFill()

const itemRefs = ref<(HTMLElement | null)[]>([])
const shakingIndex = ref(-1)

function setItemRef(index: number, el: Element | ComponentPublicInstance | null) {
  itemRefs.value[index] = el instanceof HTMLElement ? el : null
}

function bindItemRef(index: number) {
  return (el: Element | ComponentPublicInstance | null) => setItemRef(index, el)
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
  const unansweredIdx = findFirstUnansweredRequired()
  if (unansweredIdx >= 0) {
    shakingIndex.value = unansweredIdx
    await nextTick()
    const el = itemRefs.value[unansweredIdx]
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
    setTimeout(() => {
      shakingIndex.value = -1
    }, 600)
    return
  }
  await submitSurvey()
}
</script>

<style scoped lang="scss">
/* ============================================================
   PC 端问卷 — 全页展示模式
   ============================================================ */
.d-survey {
  --survey-page-bg: var(--ant-color-bg-layout, #f5f5f5);
  --survey-border: var(--ant-color-border-secondary, #e8e8e8);
  --survey-border-light: var(--ant-color-border-secondary, #f0f0f0);
  --survey-surface: var(--ant-color-bg-container, #fff);
  --survey-surface-muted: var(--ant-color-fill-quaternary, #fafafa);
  --survey-text: var(--dp-text-primary);
  --survey-text-secondary: var(--dp-text-secondary);
  --survey-text-muted: var(--dp-text-tertiary);
  --survey-text-placeholder: var(--ant-color-text-quaternary, #bbb);
  --survey-warning-bg: var(--ant-color-warning-bg, #fff3e0);
  --survey-warning-text: var(--ant-color-warning, #f57c00);
  --survey-success-bg: var(--ant-color-success-bg, #e8f5e9);
  --survey-success-text: var(--ant-color-success, #43a047);
  --survey-danger: var(--ant-color-error, #ff4d4f);
  --survey-on-primary: var(--ant-color-text-light-solid, #fff);

  min-height: 100vh;
  background: var(--survey-page-bg);
  font-family:
    -apple-system, BlinkMacSystemFont, 'PingFang SC', 'Helvetica Neue', 'Microsoft YaHei',
    sans-serif;
  -webkit-font-smoothing: antialiased;
}

/* --- 状态页 --- */
.d-survey__status {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  text-align: center;
}

.d-survey__spinner {
  width: 40px;
  height: 40px;
  border: 3px solid var(--survey-border);
  border-top-color: var(--ant-color-primary, #1677ff);
  border-radius: 50%;
  animation: d-spin 0.8s linear infinite;
}

@keyframes d-spin {
  to {
    transform: rotate(360deg);
  }
}

.d-survey__icon {
  width: 72px;
  height: 72px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 32px;
  font-weight: 700;
  margin-bottom: 24px;
}

.d-survey__icon--warn {
  background: var(--survey-warning-bg);
  color: var(--survey-warning-text);
}

.d-survey__icon--success {
  background: var(--survey-success-bg);
  color: var(--survey-success-text);

  svg {
    width: 36px;
    height: 36px;
  }
}

.d-survey__status-title {
  font-size: 22px;
  font-weight: 600;
  color: var(--survey-text);
  margin: 0 0 8px;
}

.d-survey__status-text {
  font-size: 15px;
  color: var(--survey-text-secondary);
  margin: 8px 0 0;
}

.d-survey__status-hint {
  font-size: 13px;
  color: var(--survey-text-muted);
  margin-top: 12px;
}

/* --- 横幅 --- */
.d-survey__banner {
  background: var(--ant-color-bg-container, #fff);
  padding: 48px 24px 40px;
  text-align: center;
  border-bottom: 1px solid var(--ant-color-border-secondary, #f0f0f0);
}

.d-survey__banner-inner {
  max-width: 720px;
  margin: 0 auto;
}

.d-survey__banner-badge {
  display: inline-block;
  padding: 4px 16px;
  background: var(--ant-color-primary-bg, #e6f4ff);
  border-radius: 20px;
  color: var(--ant-color-primary, #1677ff);
  font-size: 13px;
  font-weight: 500;
  letter-spacing: 2px;
  margin-bottom: 16px;
}

.d-survey__banner-title {
  font-size: 28px;
  font-weight: 700;
  color: var(--dp-text-primary);
  margin: 0 0 12px;
  line-height: 1.3;
}

.d-survey__banner-desc {
  font-size: 15px;
  color: var(--dp-text-secondary);
  line-height: 1.6;
  margin: 0 auto;
  max-width: 560px;
}

/* --- 进度条 --- */
.d-survey__progress-wrap {
  position: sticky;
  top: 0;
  z-index: 20;
  background: var(--survey-surface);
  padding: 10px 24px;
  border-bottom: 1px solid var(--survey-border-light);
  display: flex;
  align-items: center;
  gap: 16px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.04);
}

.d-survey__progress {
  flex: 1;
  height: 6px;
  background: var(--survey-border);
  border-radius: 3px;
  overflow: hidden;
}

.d-survey__progress-bar {
  height: 100%;
  background: var(--ant-color-primary, #1677ff);
  border-radius: 3px;
  transition: width 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}

.d-survey__progress-label {
  font-size: 13px;
  color: var(--survey-text-secondary);
  white-space: nowrap;
  flex-shrink: 0;
}

/* --- 内容区 --- */
.d-survey__body {
  padding: 32px 24px 64px;
}

.d-survey__container {
  max-width: 720px;
  margin: 0 auto;
}

.d-survey__welcome {
  background: var(--survey-surface);
  padding: 20px 24px;
  border-radius: 12px;
  border-left: 4px solid var(--ant-color-primary, #1677ff);
  margin-bottom: 20px;
  font-size: 15px;
  color: var(--survey-text);
  line-height: 1.6;
  font-style: italic;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.04);
}

.d-survey__meta {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: var(--survey-text-muted);
  margin-bottom: 20px;
  padding: 0 4px;
}

/* --- 身份信息 --- */
.d-survey__identity {
  background: var(--survey-surface);
  border-radius: 12px;
  padding: 24px;
  margin-bottom: 24px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.04);
}

.d-survey__identity-header {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 15px;
  font-weight: 600;
  color: var(--survey-text);
  margin-bottom: 20px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--survey-border-light);
}

.d-survey__identity-fields {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.d-survey__field {
  display: flex;
  flex-direction: column;
}

.d-survey__field-label {
  font-size: 14px;
  font-weight: 500;
  color: var(--survey-text);
  margin-bottom: 8px;
}

.d-survey__required-dot {
  color: var(--survey-danger);
}

.d-survey__input {
  height: 44px;
  padding: 0 14px;
  border: 1.5px solid var(--survey-border);
  border-radius: 10px;
  font-size: 14px;
  color: var(--survey-text);
  background: var(--survey-surface-muted);
  outline: none;
  transition: all 0.2s;

  &:focus {
    border-color: var(--ant-color-primary, #1677ff);
    background: var(--survey-surface);
    box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.08);
  }

  &::placeholder {
    color: var(--survey-text-placeholder);
  }
}

/* --- 题目卡片 --- */
.d-survey__item {
  display: flex;
  gap: 16px;
  background: var(--survey-surface);
  border-radius: 12px;
  padding: 24px;
  margin-bottom: 16px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.04);
  transition: all 0.2s;
  border: 1.5px solid transparent;

  &:hover {
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  }
}

.d-survey__item--answered {
  border-color: rgba(102, 126, 234, 0.15);
}

.d-survey__item--shake {
  animation: item-shake 0.5s ease;
  border-color: #ff4d4f;
}

@keyframes item-shake {
  0%,
  100% {
    transform: translateX(0);
  }
  20% {
    transform: translateX(-6px);
  }
  40% {
    transform: translateX(6px);
  }
  60% {
    transform: translateX(-4px);
  }
  80% {
    transform: translateX(4px);
  }
}

.d-survey__item-sidebar {
  flex-shrink: 0;
  padding-top: 2px;
}

.d-survey__item-dot {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  font-weight: 600;
  border: 2px solid var(--survey-border);
  color: var(--survey-text-muted);
  transition: all 0.2s;
}

.d-survey__item-dot--done {
  border-color: var(--ant-color-success, #52c41a);
  background: var(--ant-color-success, #52c41a);
  color: var(--survey-on-primary);
  font-size: 14px;
}

.d-survey__item-dot--req {
  border-color: var(--ant-color-error-border, #ff7875);
  color: var(--survey-danger);
}

.d-survey__item-main {
  flex: 1;
  min-width: 0;
}

.d-survey__item-header {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  margin-bottom: 18px;
}

.d-survey__item-text {
  flex: 1;
  font-size: 16px;
  font-weight: 600;
  color: var(--survey-text);
  line-height: 1.6;
}

.d-survey__required-tag {
  font-size: 11px;
  color: var(--survey-on-primary);
  background: var(--survey-danger);
  padding: 2px 8px;
  border-radius: 8px;
  font-weight: 500;
  flex-shrink: 0;
  margin-top: 3px;
}

.d-survey__item-type {
  font-size: 12px;
  color: var(--survey-text-placeholder);
  flex-shrink: 0;
  margin-top: 4px;
}

/* --- 量表题 --- */
.d-survey__scale-labels {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  color: var(--survey-text-muted);
  margin-bottom: 10px;
}

.d-survey__scale-btns {
  display: flex;
  gap: 10px;
}

.d-survey__scale-btn {
  width: 48px;
  height: 48px;
  border: 2px solid var(--survey-border);
  border-radius: 12px;
  background: var(--survey-surface-muted);
  font-size: 16px;
  font-weight: 600;
  color: var(--survey-text);
  cursor: pointer;
  transition: all 0.15s;

  &:hover {
    border-color: #c0c0c0;
    background: #f0f0f0;
  }
}

.d-survey__scale-btn--active {
  border-color: var(--ant-color-primary, #1677ff);
  background: var(--ant-color-primary, #1677ff);
  color: var(--survey-on-primary);
  box-shadow: 0 3px 10px rgba(102, 126, 234, 0.25);
  transform: scale(1.08);
}

/* --- 选择题 --- */
.d-survey__choices {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.d-survey__choice {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  border: 1.5px solid #e8e8e8;
  border-radius: 10px;
  background: var(--survey-surface-muted);
  font-size: 14px;
  color: var(--survey-text);
  cursor: pointer;
  transition: all 0.15s;
  text-align: left;
  width: 100%;

  &:hover {
    border-color: #c8c8c8;
    background: #f5f5f5;
  }
}

.d-survey__choice--active {
  border-color: var(--ant-color-primary, #1677ff);
  background: #f0f3ff;

  .d-survey__choice-letter {
    background: var(--ant-color-primary, #1677ff);
    color: var(--survey-on-primary);
    border-color: transparent;
  }
}

.d-survey__choice-letter {
  width: 26px;
  height: 26px;
  border-radius: 8px;
  border: 1.5px solid #d0d0d0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 600;
  color: var(--survey-text-secondary);
  flex-shrink: 0;
  transition: all 0.15s;
}

.d-survey__choice-text {
  flex: 1;
  line-height: 1.4;
}

.d-survey__choice-check {
  font-size: 15px;
  color: var(--ant-color-primary, #1677ff);
  font-weight: 700;
}

.d-survey__hint {
  font-size: 12px;
  color: var(--survey-text-muted);
  margin: 4px 0 0 4px;
}

/* --- 开放文本 --- */
.d-survey__textarea {
  width: 100%;
  padding: 14px 16px;
  border: 1.5px solid var(--survey-border);
  border-radius: 10px;
  font-size: 14px;
  color: var(--survey-text);
  background: var(--survey-surface-muted);
  outline: none;
  resize: vertical;
  min-height: 100px;
  box-sizing: border-box;
  font-family: inherit;

  &:focus {
    border-color: var(--ant-color-primary, #1677ff);
    background: var(--survey-surface);
    box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.08);
  }

  &::placeholder {
    color: var(--survey-text-placeholder);
  }
}

.d-survey__char-count {
  text-align: right;
  font-size: 12px;
  color: var(--survey-text-placeholder);
  margin-top: 4px;
}

/* --- 提交 --- */
.d-survey__submit {
  text-align: center;
  padding: 24px 0 32px;
}

.d-survey__btn--submit {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 200px;
  height: 48px;
  padding: 0 40px;
  border: none;
  border-radius: 24px;
  font-size: 16px;
  font-weight: 600;
  color: var(--survey-on-primary);
  background: var(--ant-color-primary, #1677ff);
  box-shadow: 0 4px 16px rgba(102, 126, 234, 0.3);
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    box-shadow: 0 6px 20px rgba(102, 126, 234, 0.4);
    transform: translateY(-1px);
  }

  &:active {
    transform: translateY(0);
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none;
  }
}
</style>
