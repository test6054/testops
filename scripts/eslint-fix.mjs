import { execSync } from 'node:child_process'

process.env.CI = 'true'
execSync('eslint . --fix', { stdio: 'inherit' })
