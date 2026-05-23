type Props = {
  visible?: boolean;
  message?: string;
};

export default function AdminTableLoadingOverlay({
  visible,
  message = "Updating...",
}: Props) {
  if (!visible) return null;

  return (
    <div className="absolute right-4 top-3 z-10 rounded-full border border-slate-200 bg-white/90 px-2.5 py-1 text-xs font-medium text-slate-500 shadow-sm">
      {message}
    </div>
  );
}
