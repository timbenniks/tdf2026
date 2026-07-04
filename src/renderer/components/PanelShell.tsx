import type { ReactNode } from 'react'
import { ConnectionStatus } from './ConnectionStatus'
import type { RaceConnectionState } from '@shared/types'

/** Shared panel chrome: rounded shell + optional footer connection bar. */
export function PanelShell({
  children,
  footer
}: {
  children: ReactNode
  footer?: {
    connection: RaceConnectionState
    lastUpdatedLabel: string
    error?: string
    onRefresh: () => void
    onReconnect: () => void
  }
}): React.JSX.Element {
  return (
    <div className="flex h-screen flex-col overflow-hidden rounded-xl">
      {children}
      {footer && (
        <ConnectionStatus
          connection={footer.connection}
          lastUpdatedLabel={footer.lastUpdatedLabel}
          error={footer.error}
          onRefresh={footer.onRefresh}
          onReconnect={footer.onReconnect}
        />
      )}
    </div>
  )
}
