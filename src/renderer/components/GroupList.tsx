import type { RaceGroup } from '@shared/types'
import { GroupCard } from './GroupCard'
import { SectionShell } from './Section'

export function GroupList({ groups }: { groups: RaceGroup[] }): React.JSX.Element {
  if (groups.length === 0) {
    return (
      <SectionShell title="Groups">
        <p className="px-1 py-2 text-xs text-white/40">
          No live group data. Groups appear once the stage telemetry is active.
        </p>
      </SectionShell>
    )
  }

  return (
    <SectionShell title={`Groups (${groups.length})`}>
      <div className="flex flex-col gap-2">
        {groups.map((g) => (
          <GroupCard key={g.id} group={g} isLead={g.order === 0} />
        ))}
      </div>
    </SectionShell>
  )
}
