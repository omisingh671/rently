import type { AdminUser } from "../types";
import Button from "@/components/ui/Button";

type Props = {
  user: AdminUser;
  isUpdating: boolean;
  onEdit: (user: AdminUser) => void;
};

export default function UserActions({
  user,
  isUpdating,
  onEdit,
}: Props) {
  return (
    <div className="flex items-center justify-end gap-3">
      <Button
        type="button"
        variant="secondary"
        size="sm"
        disabled={isUpdating}
        onClick={() => onEdit(user)}
      >
        Edit
      </Button>
    </div>
  );
}
