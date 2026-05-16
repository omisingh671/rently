import { useEffect, useMemo } from "react";
import { useFormContext, useWatch } from "react-hook-form";
import { useActiveAmenities } from "@/features/amenities/hooks/useActiveAmenities";
import { resolveIcon } from "@/utils/resolveIcon";

type PropertyFormValues = {
  amenityIds?: string[];
};

type AmenitiesGridProps = {
  iconSize?: number;
};

export default function AmenitiesGrid({ iconSize = 20 }: AmenitiesGridProps) {
  const { data: amenities = [] } = useActiveAmenities();
  const { control, setValue } = useFormContext<PropertyFormValues>();

  const watchedAmenityIds = useWatch({ control, name: "amenityIds" });
  const selected = useMemo(
    () => watchedAmenityIds ?? [],
    [watchedAmenityIds],
  );

  useEffect(() => {
    if (!amenities.length) return;

    const activeIds = amenities.map((a) => a.id);

    const filtered = selected.filter((id) => activeIds.includes(id));

    if (filtered.length !== selected.length) {
      setValue("amenityIds", filtered, { shouldDirty: true });
    }
  }, [amenities, selected, setValue]);

  const toggleAmenity = (id: string) => {
    const next = selected.includes(id)
      ? selected.filter((a) => a !== id)
      : [...selected, id];

    setValue("amenityIds", next, { shouldDirty: true });
  };

  if (!amenities.length) {
    return (
      <div className="text-sm text-slate-500">
        No active amenities available.
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-3">
      {amenities.map((a) => {
        const Icon = resolveIcon(a.icon);
        const isSelected = selected.includes(a.id);

        return (
          <button
            key={a.id}
            type="button"
            onClick={() => toggleAmenity(a.id)}
            className={`group inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm whitespace-nowrap max-w-[250px] transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-indigo-500 ${isSelected ? "border-indigo-500 bg-indigo-50 text-indigo-700 shadow-sm" : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"}`}
          >
            {Icon && (
              <Icon
                size={iconSize}
                className={`shrink-0 ${
                  isSelected
                    ? "text-indigo-600"
                    : "text-slate-500 group-hover:text-slate-700"
                }`}
              />
            )}

            <span className="font-medium leading-tight text-left">
              {a.name}
            </span>
          </button>
        );
      })}
    </div>
  );
}
