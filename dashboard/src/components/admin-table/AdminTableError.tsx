type Props = {
  message?: string;
};

export default function AdminTableError({
  message = "Something went wrong.",
}: Props) {
  return <div className="px-4 py-6 text-sm text-red-600">{message}</div>;
}
