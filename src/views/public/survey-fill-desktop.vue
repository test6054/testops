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
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
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
          <div class="d-survey__progress-bar" :style="{ width: progressPercent + '%' }" />
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
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            <span>截止时间：{{ survey.endTime }}</span>
          </div>

          <!-- 身份信息 -->
          <div v-if="!survey.allowAnonymous" class="d-survey__identity">
            <div class="d-survey__identity-header">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
              <span>填写人信息</span>
            </div>
            <div class="d-survey__identity-fields">
              <div class="d-survey__field">
                <label class="d-survey__field-label">姓名 <span class="d-survey__required-dot">*</span></label>
                <input
                  v-model="formState.respondentName"
                  type="text"
                  class="d-survey__input"
                  placeholder="请输入您的姓名"
                  maxlength="100"
                />
              </div>
              <div class="d-survey__field">
                <label class="d-survey__field-label">联系方式</label>
                <input
                  v-model="formState.respondentContact"
                  type="text"
                  class="d-survey__input"
                  placeholder="手机号或邮箱（选填）"
                  maxlength="200"
                />
              </div>
            </div>
          </div>

          <!-- 题目列表 -->
          <div
            v-for="(item, index) in survey.items"
            :key="item.id"
            :ref="(el) => setItemRef(index, el as HTMLElement)"
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
                <template v-if="isItemAnswered(item)">✓</template>
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
              <div v-if="item.itemType === 'SCALE'" class="d-survey__scale">
                <div class="d-survey__scale-labels">
                  <span>{{ getScaleOptions(item)[0]?.label || '' }}</span>
                  <span>{{ getScaleOptions(item).at(-1)?.label || '' }}</span>
                </div>
                <div class="d-survey__scale-btns">
                  <button
                    v-for="opt in getScaleOptions(item)"
                    :key="opt.value"
                    class="d-survey__scale-btn"
                    :class="{ 'd-survey__scale-btn--active': answers[item.id] === String(opt.value) }"
                    @click="answers[item.id] = String(opt.value)"
                  >
                    {{ opt.value }}
                  </button>
                </div>
              </div>

              <!-- 单选题 -->
              <div v-else-if="item.itemType === 'SINGLE_CHOICE'" class="d-survey__choices">
                <button
                  v-for="(opt, oi) in parseOptions(item.choiceOptions)"
                  :key="opt"
                  class="d-survey__choice"
                  :class="{ 'd-survey__choice--active': answers[item.id] === opt }"
                  @click="answers[item.id] = opt"
                >
                  <span class="d-survey__choice-letter">{{ String.fromCharCode(65 + oi) }}</span>
                  <span class="d-survey__choice-text">{{ opt }}</span>
                  <span v-if="answers[item.id] === opt" class="d-survey__choice-check">✓</span>
                </button>
              </div>

              <!-- 多选题 -->
              <div v-else-if="item.itemType === 'MULTI_CHOICE'" class="d-survey__choices">
                <button
                  v-for="(opt, oi) in parseOptions(item.choiceOptions)"
                  :key="opt"
                  class="d-survey__choice"
                  :class="{ 'd-survey__choice--active': (multiAnswers[item.id] || []).includes(opt) }"
                  @click="toggleMulti(item.id, opt)"
                >
                  <span class="d-survey__choice-letter">{{ String.fromCharCode(65 + oi) }}</span>
                  <span class="d-survey__choice-text">{{ opt }}</span>
                  <span v-if="(multiAnswers[item.id] || []).includes(opt)" class="d-survey__choice-check">✓</span>
                </button>
                <p class="d-survey__hint">可多选</p>
              </div>

              <!-- 开放文本 -->
              <div v-else-if="item.itemType === 'OPEN_TEXT'" class="d-survey__open">
                <textarea
                  v-model="openTexts[item.id]"
                  class="d-survey__textarea"
                  rows="4"
                  placeholder="请输入您的回答…"
                  maxlength="2000"
                />
                <div class="d-survey__char-count">{{ (openTexts[item.id] || '').length }} / 2000</div>
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
import { ref, nextTick } from 'vue'
import { useSurveyFill } from '@/composables/useSurveyFill'

const {
  loading,
  errorMessage,
  survey,
  submitted,
  submitting,
  thankYouMessage,
  formState,
  answers,
  multiAnswers,
  openTexts,
  totalCount,
  answeredCount,
  progressPercent,
  isItemAnswered,
  getScaleOptions,
  parseOptions,
  findFirstUnansweredRequired,
  submitSurvey,
} = useSurveyFill()

const itemRefs = ref<(HTMLElement | null)[]>([])
const shakingIndex = ref(-1)

function setItemRef(index: number, el: HTMLElement | null) {
  itemRefs.value[index] = el
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

function itemTypeLabel(type?: string): string {
  const map: Record<string, string> = {
    SCALE: '量表题',
    SINGLE_CHOICE: '单选题',
    MULTI_CHOICE: '多选题',
    OPEN_TEXT: '填空题',
  }
  return map[type || ''] || ''
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
    setTimeout(() => { shakingIndex.value = -1 }, 600)
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
  min-height: 100vh;
  background: #f0f2f5;
  font-family: -apple-system, BlinkMacSystemFont, 'PingFang SC', 'Helvetica Neue', 'Microsoft YaHei', sans-serif;
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
  border: 3px solid #e8e8e8;
  border-top-color: #4f6ef7;
  border-radius: 50%;
  animation: d-spin 0.8s linear infinite;
}

@keyframes d-spin {
  to { transform: rotate(360deg); }
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
  background: #fff3e0;
  color: #f57c00;
}

.d-survey__icon--success {
  background: #e8f5e9;
  color: #43a047;

  svg { width: 36px; height: 36px; }
}

.d-survey__status-title {
  font-size: 22px;
  font-weight: 600;
  color: #1a1a2e;
  margin: 0 0 8px;
}

.d-survey__status-text {
  font-size: 15px;
  color: #666;
  margin: 8px 0 0;
}

.d-survey__status-hint {
  font-size: 13px;
  color: #999;
  margin-top: 12px;
}

/* --- 横幅 --- */
.d-survey__banner {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 48px 24px 40px;
  text-align: center;
}

.d-survey__banner-inner {
  max-width: 720px;
  margin: 0 auto;
}

.d-survey__banner-badge {
  display: inline-block;
  padding: 4px 16px;
  background: rgba(255, 255, 255, 0.2);
  backdrop-filter: blur(4px);
  border-radius: 20px;
  color: #fff;
  font-size: 13px;
  font-weight: 500;
  letter-spacing: 2px;
  margin-bottom: 16px;
}

.d-survey__banner-title {
  font-size: 28px;
  font-weight: 700;
  color: #fff;
  margin: 0 0 12px;
  line-height: 1.3;
}

.d-survey__banner-desc {
  font-size: 15px;
  color: rgba(255, 255, 255, 0.85);
  line-height: 1.6;
  margin: 0;
  max-width: 560px;
  margin: 0 auto;
}

/* --- 进度条 --- */
.d-survey__progress-wrap {
  position: sticky;
  top: 0;
  z-index: 20;
  background: #fff;
  padding: 10px 24px;
  border-bottom: 1px solid #f0f0f0;
  display: flex;
  align-items: center;
  gap: 16px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.04);
}

.d-survey__progress {
  flex: 1;
  height: 6px;
  background: #e8e8e8;
  border-radius: 3px;
  overflow: hidden;
}

.d-survey__progress-bar {
  height: 100%;
  background: linear-gradient(90deg, #667eea, #764ba2);
  border-radius: 3px;
  transition: width 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}

.d-survey__progress-label {
  font-size: 13px;
  color: #888;
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
  background: #fff;
  padding: 20px 24px;
  border-radius: 12px;
  border-left: 4px solid #667eea;
  margin-bottom: 20px;
  font-size: 15px;
  color: #555;
  line-height: 1.6;
  font-style: italic;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.04);
}

.d-survey__meta {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: #999;
  margin-bottom: 20px;
  padding: 0 4px;
}

/* --- 身份信息 --- */
.d-survey__identity {
  background: #fff;
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
  color: #333;
  margin-bottom: 20px;
  padding-bottom: 12px;
  border-bottom: 1px solid #f0f0f0;
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
  color: #333;
  margin-bottom: 8px;
}

.d-survey__required-dot {
  color: #ff4d4f;
}

.d-survey__input {
  height: 44px;
  padding: 0 14px;
  border: 1.5px solid #e0e0e0;
  border-radius: 10px;
  font-size: 14px;
  color: #333;
  background: #fafafa;
  outline: none;
  transition: all 0.2s;

  &:focus {
    border-color: #667eea;
    background: #fff;
    box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.08);
  }

  &::placeholder { color: #bbb; }
}

/* --- 题目卡片 --- */
.d-survey__item {
  display: flex;
  gap: 16px;
  background: #fff;
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
  0%, 100% { transform: translateX(0); }
  20% { transform: translateX(-6px); }
  40% { transform: translateX(6px); }
  60% { transform: translateX(-4px); }
  80% { transform: translateX(4px); }
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
  border: 2px solid #e0e0e0;
  color: #999;
  transition: all 0.2s;
}

.d-survey__item-dot--done {
  border-color: #52c41a;
  background: #52c41a;
  color: #fff;
  font-size: 14px;
}

.d-survey__item-dot--req {
  border-color: #ff7875;
  color: #ff4d4f;
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
  color: #1a1a2e;
  line-height: 1.6;
}

.d-survey__required-tag {
  font-size: 11px;
  color: #fff;
  background: #ff4d4f;
  padding: 2px 8px;
  border-radius: 8px;
  font-weight: 500;
  flex-shrink: 0;
  margin-top: 3px;
}

.d-survey__item-type {
  font-size: 12px;
  color: #bbb;
  flex-shrink: 0;
  margin-top: 4px;
}

/* --- 量表题 --- */
.d-survey__scale-labels {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  color: #999;
  margin-bottom: 10px;
}

.d-survey__scale-btns {
  display: flex;
  gap: 10px;
}

.d-survey__scale-btn {
  width: 48px;
  height: 48px;
  border: 2px solid #e0e0e0;
  border-radius: 12px;
  background: #fafafa;
  font-size: 16px;
  font-weight: 600;
  color: #555;
  cursor: pointer;
  transition: all 0.15s;

  &:hover {
    border-color: #c0c0c0;
    background: #f0f0f0;
  }
}

.d-survey__scale-btn--active {
  border-color: #667eea;
  background: linear-gradient(135deg, #667eea, #764ba2);
  color: #fff;
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
  background: #fafafa;
  font-size: 14px;
  color: #333;
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
  border-color: #667eea;
  background: #f0f3ff;

  .d-survey__choice-letter {
    background: linear-gradient(135deg, #667eea, #764ba2);
    color: #fff;
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
  color: #888;
  flex-shrink: 0;
  transition: all 0.15s;
}

.d-survey__choice-text {
  flex: 1;
  line-height: 1.4;
}

.d-survey__choice-check {
  font-size: 15px;
  color: #667eea;
  font-weight: 700;
}

.d-survey__hint {
  font-size: 12px;
  color: #999;
  margin: 4px 0 0 4px;
}

/* --- 开放文本 --- */
.d-survey__textarea {
  width: 100%;
  padding: 14px 16px;
  border: 1.5px solid #e0e0e0;
  border-radius: 10px;
  font-size: 14px;
  color: #333;
  background: #fafafa;
  outline: none;
  resize: vertical;
  min-height: 100px;
  box-sizing: border-box;
  font-family: inherit;

  &:focus {
    border-color: #667eea;
    background: #fff;
    box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.08);
  }

  &::placeholder { color: #bbb; }
}

.d-survey__char-count {
  text-align: right;
  font-size: 12px;
  color: #ccc;
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
  color: #fff;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
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
