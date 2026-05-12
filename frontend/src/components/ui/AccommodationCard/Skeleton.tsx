export default function Skeleton() {
  return (
    <article className="bg-white rounded-2xl overflow-hidden border border-surface-3 animate-pulse md:flex md:items-stretch">
      {/* image / media placeholder */}
      <div className="w-full h-56 md:h-auto md:w-1/2 bg-surface-3" />

      {/* content placeholder */}
      <div className="p-6 md:p-7 flex-1">
        <div className="h-4 w-32 bg-surface-3 rounded mb-3" />

        <div className="h-6 w-2/3 bg-surface-3 rounded mb-2" />
        <div className="h-4 w-24 bg-surface-3 rounded mb-4" />

        <div className="h-3 w-full bg-surface-3 rounded mb-3" />
        <div className="h-3 w-full bg-surface-3 rounded mb-3" />
        <div className="h-3 w-3/4 bg-surface-3 rounded mb-6" />

        <div className="h-10 w-full bg-surface-3 rounded" />
      </div>
    </article>
  );
}
