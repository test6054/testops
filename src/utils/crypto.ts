/**
 * AJ-Captcha 加密工具
 * 用于滑块/点选验证码坐标数据加密
 */
import CryptoJS from 'crypto-js'

/**
 * AES加密（用于验证码坐标加密）
 * AJ-Captcha使用AES/CBC/PKCS7Padding模式
 *
 * @param data 待加密文本
 * @param secretKey 密钥（从后端获取）
 * @returns Base64编码的加密结果
 */
export function aesEncrypt(data: string, secretKey: string): string {
  const key = CryptoJS.enc.Utf8.parse(secretKey)
  // AJ-Captcha 标准协议约定：IV 与 Key 使用相同值
  // 这是验证码场景的固定实现，与后端 AJ-Captcha SDK 保持一致，不可单独修改
  const iv = CryptoJS.enc.Utf8.parse(secretKey)

  const encrypted = CryptoJS.AES.encrypt(data, key, {
    iv,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7
  })

  return encrypted.toString()
}
