/** Standard panel section: an uppercase heading above its content. */
export function SectionShell({
  title,
  children
}: {
  title: string
  children: React.ReactNode
}): React.JSX.Element {
  return (
    <section className="px-4 py-3">
      <h2 className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/40">
        {title}
      </h2>
      {children}
    </section>
  )
}
