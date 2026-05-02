export type DeployContext = 'dev' | 'pr-preview'

export interface DeployInfo {
  context: DeployContext
  label: string
  detail?: string
}

function shortSha(value: string | undefined) {
  return value ? value.slice(0, 7) : undefined
}

export function getDeployInfo(): DeployInfo | null {
  const context = import.meta.env.VITE_DEPLOY_CONTEXT
  const commitSha = shortSha(import.meta.env.VITE_COMMIT_SHA)

  if (context === 'dev') {
    return {
      context,
      label: import.meta.env.VITE_DEPLOY_LABEL || 'DEV',
      detail: commitSha,
    }
  }

  if (context === 'pr-preview') {
    const prNumber = import.meta.env.VITE_PR_NUMBER
    return {
      context,
      label: prNumber ? `PR #${prNumber}` : 'PR',
      detail: commitSha,
    }
  }

  return null
}
