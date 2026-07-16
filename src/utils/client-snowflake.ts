/**
 * 生成与后端 IdService 同结构的客户端雪花 ID。
 * 制卷草稿图内临时 ID 与后端草稿 ID 协议一致，前端 API 字段以 string 承接 Long。
 */
const EPOCH = 1704067200000n
const WORKER_ID_BITS = 5n
const DATACENTER_ID_BITS = 5n
const SEQUENCE_BITS = 12n
const DATACENTER_ID_SHIFT = SEQUENCE_BITS + WORKER_ID_BITS
const TIMESTAMP_LEFT_SHIFT = SEQUENCE_BITS + WORKER_ID_BITS + DATACENTER_ID_BITS
const SEQUENCE_MASK = (1n << SEQUENCE_BITS) - 1n

const LAYOUT_WORKER_ID_KEY = 'layoutDraftWorkerId'
const LAYOUT_DATACENTER_ID_KEY = 'layoutDraftDatacenterId'

let lastTimestamp = -1n
let sequence = 0n

function getOrInitNodeId(key: string): bigint {
  const cached = localStorage.getItem(key)
  if (cached) {
    return BigInt(cached)
  }
  let value: bigint
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    const buf = new Uint8Array(1)
    crypto.getRandomValues(buf)
    value = BigInt(buf[0] % 32)
  } else {
    value = BigInt(Date.now() % 32)
  }
  localStorage.setItem(key, value.toString())
  return value
}

function waitNextMillis(lastTime: bigint): bigint {
  let now = BigInt(Date.now())
  while (now <= lastTime) {
    now = BigInt(Date.now())
  }
  return now
}

/** 生成制卷草稿临时雪花 ID（string，对应后端 Long） */
export function createClientSnowflakeId(): string {
  let timestamp = BigInt(Date.now())
  if (timestamp < lastTimestamp) {
    throw new Error('系统时间回拨，无法生成制卷草稿 ID')
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
  const workerId = getOrInitNodeId(LAYOUT_WORKER_ID_KEY)
  const datacenterId = getOrInitNodeId(LAYOUT_DATACENTER_ID_KEY)
  const id
    = ((timestamp - EPOCH) << TIMESTAMP_LEFT_SHIFT)
      | (datacenterId << DATACENTER_ID_SHIFT)
      | (workerId << SEQUENCE_BITS)
      | sequence
  return id.toString()
}
