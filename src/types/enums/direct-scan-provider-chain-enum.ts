/** 试卷直扫租户单选 OCR 渠道的服务端冻结值 - 与 edu-mark DirectScanProviderChain 对齐 */
export enum DirectScanProviderChainCode {
  BAIDU_QWEN = 'BAIDU_QWEN',
  PADDLE_LOCAL = 'PADDLE_LOCAL',
}

export const ALL_DIRECT_SCAN_PROVIDER_CHAIN_CODES: readonly DirectScanProviderChainCode[] = [
  DirectScanProviderChainCode.BAIDU_QWEN,
  DirectScanProviderChainCode.PADDLE_LOCAL,
]

export const DirectScanProviderChainDescription: Record<DirectScanProviderChainCode, string> = {
  [DirectScanProviderChainCode.BAIDU_QWEN]: '云端百度 OCR',
  [DirectScanProviderChainCode.PADDLE_LOCAL]: '本地 PaddleOCR',
}

