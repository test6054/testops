export interface PasswordStrengthState {
  minLength: boolean
  uppercase: boolean
  lowercase: boolean
  digit: boolean
  special: boolean
  score: number
}

export function hasSpecialChar(password: string): boolean {
  return /[^a-z0-9]/i.test(password)
}

export function evaluatePasswordStrength(password: string, minLength = 8): PasswordStrengthState {
  const state = {
    minLength: password.length >= minLength,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    digit: /\d/.test(password),
    special: hasSpecialChar(password),
    score: 0,
  }

  state.score = [
    state.minLength,
    state.uppercase,
    state.lowercase,
    state.digit,
    state.special,
  ].filter(Boolean).length

  return state
}

export function getPasswordStrengthText(score: number): string {
  if (score <= 0) return '无'
  if (score <= 2) return '弱'
  if (score <= 3) return '中等'
  if (score <= 4) return '强'
  return '很强'
}
