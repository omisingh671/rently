type Props = {
  visible?: boolean;
  message?: string;
};

export default function AdminTableLoadingOverlay({
  visible,
  message = "Updating…",
}: Props) {
  if (!visible) return null;

  return (
    <div className="absolute right-3 top-3 text-xs text-slate-500">
      {message}
    </div>
  );
}
