<template>
  <a-modal
    v-model:open="visible"
    :title="undefined"
    :width="340"
    :footer="null"
    :closable="true"
    :mask-closable="false"
    wrap-class-name="aj-captcha-modal"
    @cancel="handleClose"
  >
    <div class="aj-captcha-container">
      <!-- 标题 -->
      <div class="captcha-header">
        <span class="captcha-title">请完成安全验证</span>
        <a-button type="text" size="small" @click="refreshCaptcha">
          <template #icon>
            <ReloadOutlined />
          </template>
        </a-button>
      </div>

      <!-- 加载状态 -->
      <div v-if="loading" class="captcha-loading">
        <a-spin dot />
        <span>加载中...</span>
      </div>

      <!-- 滑块拼图验证码 -->
      <template v-else-if="captchaType === 'blockPuzzle'">
        <div class="captcha-image-container">
          <!-- 背景图 -->
          <div
            class="captcha-bg"
            :style="{ backgroundImage: `url(${captchaData.originalImageBase64})` }"
          >
            <!-- 滑块图 -->
            <div
              class="captcha-block"
              :style="{
                backgroundImage: `url(${captchaData.jigsawImageBase64})`,
                left: `${sliderLeft}px`,
                top: `${captchaData.yPos || 0}px`,
              }"
            />
          </div>
        </div>

        <!-- 滑动条 -->
        <div class="slider-container" :class="sliderClass">
          <div class="slider-track">
            <div class="slider-fill" :style="{ width: `${sliderLeft}px` }"></div>
            <div
              class="slider-btn"
              :style="{ left: `${sliderLeft}px` }"
              @mousedown="startDrag"
              @touchstart.prevent="startDrag"
            >
              <RightOutlined v-if="!verifying && !verifySuccess && !verifyFail" />
              <LoadingOutlined v-else-if="verifying" spin />
              <CheckOutlined v-else-if="verifySuccess" />
              <CloseOutlined v-else-if="verifyFail" />
            </div>
          </div>
          <div class="slider-tip">{{ sliderTip }}</div>
        </div>
      </template>

      <!-- 点选文字验证码 -->
      <template v-else-if="captchaType === 'clickWord'">
        <div class="captcha-image-container click-word">
          <div
            class="captcha-bg clickable"
            :style="{ backgroundImage: `url(${captchaData.originalImageBase64})` }"
            @click="handleImageClick"
          >
            <!-- 已点击的点 -->
            <div
              v-for="(point, index) in clickPoints"
              :key="index"
              class="click-point"
              :style="{ left: `${point.x - 15}px`, top: `${point.y - 15}px` }"
            >
              {{ index + 1 }}
            </div>
          </div>
        </div>
        <div class="click-word-tip">
          <span>请依次点击：</span>
          <span class="word-list">{{ captchaData.wordList?.join(' ') }}</span>
        </div>
        <div class="click-word-actions">
          <a-button size="small" @click="clearClickPoints"> 清除 </a-button>
          <a-button size="small" type="primary" :loading="verifying" @click="verifyClickWord">
            确认
          </a-button>
        </div>
      </template>

      <!-- 错误提示 -->
      <div v-if="errorMsg" class="captcha-error">
        <ExclamationCircleFilled />
        <span>{{ errorMsg }}</span>
      </div>
    </div>
  </a-modal>
</template>

<script lang="ts" setup>
import CheckOutlined from '@ant-design/icons-vue/CheckOutlined'
import CloseOutlined from '@ant-design/icons-vue/CloseOutlined'
import ExclamationCircleFilled from '@ant-design/icons-vue/ExclamationCircleFilled'
import LoadingOutlined from '@ant-design/icons-vue/LoadingOutlined'
import ReloadOutlined from '@ant-design/icons-vue/ReloadOutlined'
import RightOutlined from '@ant-design/icons-vue/RightOutlined'
import { computed, onUnmounted, ref, watch } from 'vue'
import { checkCaptcha, getCaptcha } from '@/apis/auth'
import { aesEncrypt } from '@/utils/crypto'
import { getUserErrorMessage } from '@/utils/error-handler'

const visible = defineModel<boolean>({ default: false })

const props = defineProps<{
  captchaType?: 'blockPuzzle' | 'clickWord'
}>()

const emit = defineEmits<{
  (e: 'success', captchaVerification: string): void
  (e: 'fail'): void
}>()

// 验证码数据接口
interface CaptchaData {
  token?: string
  secretKey?: string
  originalImageBase64?: string
  jigsawImageBase64?: string
  /** 拼图滑块的 Y 轴位置 */
  yPos?: number
  wordList?: string[]
  captchaVerification?: string
}

// 状态
const loading = ref(false)
const verifying = ref(false)
const verifySuccess = ref(false)
const verifyFail = ref(false)
const errorMsg = ref('')

// 验证码数据
const captchaData = ref<CaptchaData>({} as CaptchaData)
const secretKey = ref('')

// 滑块相关
const sliderLeft = ref(0)
const isDragging = ref(false)
const startX = ref(0)
const startTime = ref(0)
const moveTrack = ref<Array<{ x: number, y: number, t: number }>>([])

// 点选相关
const clickPoints = ref<Array<{ x: number, y: number }>>([])

// 计算属性
const sliderClass = computed(() => ({
  'is-verifying': verifying.value,
  'is-success': verifySuccess.value,
  'is-fail': verifyFail.value,
}))

const sliderTip = computed(() => {
  if (verifySuccess.value) return '验证成功'
  if (verifyFail.value) return '验证失败，请重试'
  if (verifying.value) return '验证中...'
  return '向右拖动滑块完成验证'
})

// 监听visible变化
watch(visible, (val) => {
  if (val) {
    refreshCaptcha()
  } else {
    resetState()
  }
})

// 获取验证码
const refreshCaptcha = async () => {
  resetState()
  loading.value = true
  errorMsg.value = ''

  try {
    const type = props.captchaType || 'blockPuzzle'
    const res = await getCaptcha({ captchaType: type })

    if (res.repCode === '0000' && res.repData) {
      captchaData.value = res.repData
      secretKey.value = res.repData.secretKey || ''
    } else {
      errorMsg.value = res.repMsg || '获取验证码失败'
    }
  } catch (error) {
    errorMsg.value = getUserErrorMessage(error, '获取验证码失败')
  } finally {
    loading.value = false
  }
}

// 重置状态
const resetState = () => {
  sliderLeft.value = 0
  verifying.value = false
  verifySuccess.value = false
  verifyFail.value = false
  clickPoints.value = []
  moveTrack.value = []
  errorMsg.value = ''
}

// 滑块拖动开始
const startDrag = (e: MouseEvent | TouchEvent) => {
  if (verifying.value || verifySuccess.value) return

  isDragging.value = true
  startTime.value = Date.now()
  moveTrack.value = []

  startX.value = 'touches' in e ? e.touches[0].clientX : e.clientX

  document.addEventListener('mousemove', onDrag)
  document.addEventListener('mouseup', endDrag)
  document.addEventListener('touchmove', onDrag)
  document.addEventListener('touchend', endDrag)
}

// 滑块拖动中
const onDrag = (e: MouseEvent | TouchEvent) => {
  if (!isDragging.value) return

  const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
  const clientY = 'touches' in e ? e.touches[0].clientY : (e as MouseEvent).clientY

  let moveX = clientX - startX.value

  // 限制滑动范围
  const maxMove = 260 // 图片宽度 - 滑块宽度
  moveX = Math.max(0, Math.min(moveX, maxMove))

  sliderLeft.value = moveX

  // 记录轨迹
  moveTrack.value.push({
    x: moveX,
    y: clientY,
    t: Date.now() - startTime.value,
  })
}

// 滑块拖动结束
const endDrag = async () => {
  if (!isDragging.value) return

  isDragging.value = false
  document.removeEventListener('mousemove', onDrag)
  document.removeEventListener('mouseup', endDrag)
  document.removeEventListener('touchmove', onDrag)
  document.removeEventListener('touchend', endDrag)

  if (sliderLeft.value < 10) {
    sliderLeft.value = 0
    return
  }

  await verifySlider()
}

// 验证滑块
const verifySlider = async () => {
  verifying.value = true
  errorMsg.value = ''

  try {
    const token = captchaData.value.token
    if (!token) {
      errorMsg.value = '验证码已过期，请刷新重试'
      await refreshCaptcha()
      return
    }

    // 构建验证数据
    const pointJson = JSON.stringify({ x: sliderLeft.value, y: 5 })
    const encryptedPoint = secretKey.value ? aesEncrypt(pointJson, secretKey.value) : pointJson

    const res = await checkCaptcha({
      captchaType: 'blockPuzzle',
      pointJson: encryptedPoint,
      token,
    })

    if (res.repCode === '0000' && res.repData) {
      verifySuccess.value = true
      // 延迟关闭并回调
      const verification = res.repData.captchaVerification ?? ''
      setTimeout(() => {
        emit('success', verification)
        visible.value = false
      }, 500)
    } else {
      verifyFail.value = true
      errorMsg.value = res.repMsg || '验证失败'
      // 延迟刷新
      setTimeout(() => {
        refreshCaptcha()
      }, 1000)
    }
  } catch (error) {
    verifyFail.value = true
    errorMsg.value = getUserErrorMessage(error, '验证失败，请重试')
    setTimeout(() => {
      refreshCaptcha()
    }, 1000)
  } finally {
    verifying.value = false
  }
}

// 点选图片点击
const handleImageClick = (e: MouseEvent) => {
  if (verifying.value || verifySuccess.value) return

  const target = e.currentTarget as HTMLElement
  const rect = target.getBoundingClientRect()
  const x = e.clientX - rect.left
  const y = e.clientY - rect.top

  // 最多点选4个点
  if (clickPoints.value.length < (captchaData.value.wordList?.length || 4)) {
    clickPoints.value.push({ x, y })
  }
}

// 清除点选
const clearClickPoints = () => {
  clickPoints.value = []
}

// 验证点选
const verifyClickWord = async () => {
  if (clickPoints.value.length !== captchaData.value.wordList?.length) {
    errorMsg.value = `请点击${captchaData.value.wordList?.length || 4}个文字`
    return
  }

  verifying.value = true
  errorMsg.value = ''

  try {
    const token = captchaData.value.token
    if (!token) {
      errorMsg.value = '验证码已过期，请刷新重试'
      await refreshCaptcha()
      return
    }

    const pointJson = JSON.stringify(clickPoints.value)
    const encryptedPoint = secretKey.value ? aesEncrypt(pointJson, secretKey.value) : pointJson

    const res = await checkCaptcha({
      captchaType: 'clickWord',
      pointJson: encryptedPoint,
      token,
    })

    if (res.repCode === '0000' && res.repData) {
      verifySuccess.value = true
      const verification = res.repData.captchaVerification ?? ''
      setTimeout(() => {
        emit('success', verification)
        visible.value = false
      }, 500)
    } else {
      verifyFail.value = true
      errorMsg.value = res.repMsg || '验证失败'
      setTimeout(() => {
        refreshCaptcha()
      }, 1000)
    }
  } catch (error) {
    verifyFail.value = true
    errorMsg.value = getUserErrorMessage(error, '验证失败，请重试')
    setTimeout(() => {
      refreshCaptcha()
    }, 1000)
  } finally {
    verifying.value = false
  }
}

// 关闭弹窗
const handleClose = () => {
  emit('fail')
}

// 组件卸载时清理
onUnmounted(() => {
  document.removeEventListener('mousemove', onDrag)
  document.removeEventListener('mouseup', endDrag)
  document.removeEventListener('touchmove', onDrag)
  document.removeEventListener('touchend', endDrag)
})
</script>

<style lang="scss" scoped>
.aj-captcha-container {
  padding: 16px;
}

.captcha-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;

  .captcha-title {
    font-size: 16px;
    font-weight: 500;
    color: var(--ant-color-text);
  }
}

.captcha-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 200px;
  gap: 12px;
  color: var(--ant-color-text-tertiary);
}

.captcha-image-container {
  position: relative;
  width: 310px;
  height: 155px;
  border-radius: var(--dp-radius-xs);
  overflow: hidden;
  background-color: var(--ant-color-bg-container);

  .captcha-bg {
    width: 100%;
    height: 100%;
    background-size: cover;
    background-position: center;
    background-repeat: no-repeat;

    &.clickable {
      cursor: pointer;
    }
  }

  .captcha-block {
    position: absolute;
    width: 50px;
    height: 50px;
    background-size: contain;
    background-repeat: no-repeat;
  }
}

.slider-container {
  margin-top: 12px;

  .slider-track {
    position: relative;
    height: 40px;
    background-color: var(--ant-color-bg-container);
    border-radius: var(--dp-radius-xs);
    border: 1px solid var(--ant-color-border);
  }

  .slider-fill {
    position: absolute;
    left: 0;
    top: 0;
    height: 100%;
    background-color: var(--ant-color-primary);
    opacity: 0.3;
    border-radius: var(--dp-radius-xs) 0 0 var(--dp-radius-xs);
    transition: none;
  }

  .slider-btn {
    position: absolute;
    top: 0;
    width: 50px;
    height: 38px;
    background-color: var(--ant-color-bg-container);
    border: 1px solid var(--ant-color-border);
    border-radius: var(--dp-radius-xs);
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: grab;
    transition: none;
    box-shadow: var(--dp-shadow-sm);

    &:hover {
      border-color: var(--ant-color-primary);
    }

    &:active {
      cursor: grabbing;
    }

    .anticon {
      font-size: 18px;
      color: var(--ant-color-primary);
    }
  }

  .slider-tip {
    text-align: center;
    font-size: 12px;
    color: var(--ant-color-text-tertiary);
    margin-top: 8px;
  }

  &.is-success {
    .slider-track {
      border-color: var(--ant-color-success);
    }

    .slider-fill {
      background-color: var(--ant-color-success);
    }

    .slider-btn {
      border-color: var(--ant-color-success);

      .anticon {
        color: var(--ant-color-success);
      }
    }

    .slider-tip {
      color: var(--ant-color-success);
    }
  }

  &.is-fail {
    .slider-track {
      border-color: var(--ant-color-error);
    }

    .slider-fill {
      background-color: var(--ant-color-error);
    }

    .slider-btn {
      border-color: var(--ant-color-error);

      .anticon {
        color: var(--ant-color-error);
      }
    }

    .slider-tip {
      color: var(--ant-color-error);
    }
  }
}

.click-point {
  position: absolute;
  width: 30px;
  height: 30px;
  background-color: var(--ant-color-primary);
  border-radius: var(--dp-radius-full);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--ant-color-bg-container);
  font-size: 14px;
  font-weight: 500;
  box-shadow: var(--dp-shadow-sm);
}

.click-word-tip {
  margin-top: 12px;
  text-align: center;
  font-size: 14px;
  color: var(--ant-color-text-secondary);

  .word-list {
    color: var(--ant-color-primary);
    font-weight: 500;
  }
}

.click-word-actions {
  display: flex;
  justify-content: center;
  gap: 12px;
  margin-top: 12px;
}

.captcha-error {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 12px;
  padding: 8px 12px;
  background-color: var(--ant-color-error-bg);
  border-radius: var(--dp-radius-xs);
  font-size: 13px;
  color: var(--ant-color-error);

  .anticon {
    font-size: 14px;
  }
}
</style>

<style lang="scss">
.aj-captcha-modal {
  .ant-modal-header {
    display: none;
  }

  .ant-modal-body {
    padding: 0;
  }
}
</style>
