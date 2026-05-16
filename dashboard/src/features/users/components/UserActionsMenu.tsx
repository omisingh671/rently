import type { AdminUser, UpdateUserVariables } from "../types";
import { useAuthStore } from "@/stores/authStore";
import Button from "@/components/ui/Button";
import UserStatusToggle from "./UserStatusToggle";

type Props = {
  user: AdminUser;
  isUpdating: boolean;
  onEdit: (user: AdminUser) => void;
  onUpdateUser: (vars: UpdateUserVariables) => void;
};

export default function UserActions({
  user,
  isUpdating,
  onEdit,
  onUpdateUser,
}: Props) {
  const currentUser = useAuthStore((s) => s.user);
  const isSelf = currentUser?.id === user.id;

  return (
    <div className="flex items-center justify-end gap-4">
      <Button
        type="button"
        variant="secondary"
        size="sm"
        disabled={isUpdating}
        onClick={() => onEdit(user)}
      >
        Edit
      </Button>
      <UserStatusToggle
        checked={user.isActive}
        disabled={isSelf || isUpdating}
        onChange={(next) =>
          onUpdateUser({
            userId: user.id,
            payload: { isActive: next },
          })
        }
      />
    </div>
  );
}
