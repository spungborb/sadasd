export default function SkeletonCard() {
  return (
    <div className="bg-zinc-900 border border-white/5 rounded-xl overflow-hidden">
      {/* Header shimmer */}
      <div className="h-32 shimmer" />
      {/* Body */}
      <div className="p-4 space-y-3">
        <div className="h-4 w-3/4 rounded shimmer" />
        <div className="h-7 w-1/3 rounded shimmer" />
        <div className="pt-3 border-t border-white/5 flex justify-between">
          <div className="h-4 w-12 rounded shimmer" />
          <div className="h-4 w-16 rounded shimmer" />
          <div className="h-4 w-14 rounded shimmer" />
        </div>
      </div>
    </div>
  );
}
