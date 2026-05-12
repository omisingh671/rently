export default function UserStatusBadge({ isActive }: { isActive: boolean }) {
  return (
    <span
      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
        isActive ? "bg-green-100 text-green-700" : "bg-gray-200 text-gray-700"
      }`}
    >
      {isActive ? "Active" : "Inactive"}
    </span>
  );
}
