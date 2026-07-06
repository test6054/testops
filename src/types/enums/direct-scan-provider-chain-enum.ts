/** 试卷直扫互斥识别链路 - 与 edu-mark DirectScanProviderChain 对齐 */
export enum DirectScanProviderChainCode {
  BAIDU_QWEN = 'BAIDU_QWEN',
  PADDLE_LOCAL = 'PADDLE_LOCAL',
}

export const ALL_DIRECT_SCAN_PROVIDER_CHAIN_CODES: readonly DirectScanProviderChainCode[] = [
  DirectScanProviderChainCode.BAIDU_QWEN,
  DirectScanProviderChainCode.PADDLE_LOCAL,
]

