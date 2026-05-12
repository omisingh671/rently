import { ICON_REGISTRY } from "@/configs/iconRegistry";

export function resolveIcon(iconName: string | null) {
  if (!iconName) return null;

  return ICON_REGISTRY[iconName] ?? null;
}
