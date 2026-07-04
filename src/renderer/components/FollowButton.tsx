import { useRaceStore } from '../store/raceStore'

/** Star toggle to follow/unfollow a rider or team; persisted in the store. */
export function FollowButton({
  kind,
  id
}: {
  kind: 'rider' | 'team'
  id: string
}): React.JSX.Element {
  const following = useRaceStore((s) =>
    kind === 'rider' ? s.follows.riders.includes(id) : s.follows.teams.includes(id)
  )
  const toggle = useRaceStore((s) =>
    kind === 'rider' ? s.toggleFollowRider : s.toggleFollowTeam
  )

  return (
    <button
      onClick={() => toggle(id)}
      title={following ? 'Following — click to unfollow' : 'Follow'}
      aria-pressed={following}
      className={`flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium transition ${
        following
          ? 'bg-yellow-400/20 text-yellow-200 hover:bg-yellow-400/30'
          : 'bg-white/10 text-white/70 hover:bg-white/20'
      }`}
    >
      <span aria-hidden>{following ? '★' : '☆'}</span>
      {following ? 'Following' : 'Follow'}
    </button>
  )
}
