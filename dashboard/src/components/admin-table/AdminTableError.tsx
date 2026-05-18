type Props = {
  message?: string;
};

export default function AdminTableError({
  message = "Something went wrong.",
}: Props) {
  return (
    <div className="border-b border-rose-100 bg-rose-50 px-6 py-3 text-sm text-rose-700">
      {message}
    </div>
  );
}
