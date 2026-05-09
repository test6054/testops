/**
 * 设备ID管理工具
 * 用于多点登录限制功能，生成和管理唯一设备标识
 *
 * 设计说明：
 * - 每个浏览器生成唯一的设备ID（IdService 同款雪花ID）
 * - 存储在 localStorage 中，重新打开浏览器保持不变
 * - 清除浏览器数据后会生成新的设备ID
 */

/** localStorage 中设备ID的存储键 */
const DEVICE_ID_KEY = 'deviceId'

/** 客户端类型标识 */
export const CLIENT_TYPE = 'WEB'

/**
 * 生成雪花ID（与后端 IdService 结构一致）
 */
const WORKER_ID_KEY = 'deviceWorkerId'
const DATACENTER_ID_KEY = 'deviceDatacenterId'

const EPOCH = 1704067200000n
const WORKER_ID_BITS = 5n
const DATACENTER_ID_BITS = 5n
const SEQUENCE_BITS = 12n
const WORKER_ID_SHIFT = SEQUENCE_BITS
const DATACENTER_ID_SHIFT = SEQUENCE_BITS + WORKER_ID_BITS
const TIMESTAMP_LEFT_SHIFT = SEQUENCE_BITS + WORKER_ID_BITS + DATACENTER_ID_BITS
const SEQUENCE_MASK = (1n << SEQUENCE_BITS) - 1n

let lastTimestamp = -1n
let sequence = 0n

function getOrInitNodeId(key: string): bigint {
  const cached = localStorage.getItem(key)
  if (cached) {
    return BigInt(cached)
  }
  const value = generateNodeId()
  localStorage.setItem(key, value.toString())
  return value
}

function generateNodeId(): bigint {
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    const buf = new Uint8Array(1)
    crypto.getRandomValues(buf)
    return BigInt(buf[0] % 32)
  }
  return BigInt(Date.now() % 32)
}

function waitNextMillis(lastTime: bigint): bigint {
  let now = BigInt(Date.now())
  while (now <= lastTime) {
    now = BigInt(Date.now())
  }
  return now
}

function generateSnowflakeId(): string {
  let timestamp = BigInt(Date.now())
  if (timestamp < lastTimestamp) {
    throw new Error('系统时间回拨，无法生成设备ID')
  }

  if (timestamp === lastTimestamp) {
    sequence = (sequence + 1n) & SEQUENCE_MASK
    if (sequence === 0n) {
      timestamp = waitNextMillis(lastTimestamp)
    }
  } else {
    sequence = 0n
  }

  lastTimestamp = timestamp

  const workerId = getOrInitNodeId(WORKER_ID_KEY)
  const datacenterId = getOrInitNodeId(DATACENTER_ID_KEY)

  const id
    = ((timestamp - EPOCH) << TIMESTAMP_LEFT_SHIFT)
      | (datacenterId << DATACENTER_ID_SHIFT)
      | (workerId << WORKER_ID_SHIFT)
      | sequence

  return id.toString()
}

/**
 * 获取或生成设备ID
 * 如果 localStorage 中已有设备ID则返回，否则生成新的并存储
 *
 * @returns 设备唯一标识（雪花ID）
 */
export function getDeviceId(): string {
  let deviceId = localStorage.getItem(DEVICE_ID_KEY)

  if (!deviceId) {
    deviceId = generateSnowflakeId()
    localStorage.setItem(DEVICE_ID_KEY, deviceId)
  }

  return deviceId
}

/**
 * 强制重新生成设备ID
 * 用于特殊场景，如用户主动切换设备标识
 *
 * @returns 新生成的设备ID
 */
export function regenerateDeviceId(): string {
  const newDeviceId = generateSnowflakeId()
  localStorage.setItem(DEVICE_ID_KEY, newDeviceId)
  return newDeviceId
}

/**
 * 获取设备信息头
 * 返回需要添加到请求头的设备相关信息
 *
 * @returns 设备信息对象，可直接展开到请求头
 */
export function getDeviceHeaders(): Record<string, string> {
  return {
    'X-Device-Id': getDeviceId(),
    'X-Client-Type': CLIENT_TYPE,
  }
}
