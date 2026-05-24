import Button from "@/components/ui/Button";
import type { Amenity } from "@/features/amenities/types";
import { resolveIcon } from "@/utils/resolveIcon";
import type { AdminProperty } from "../types";

type Props = {
  property: AdminProperty;
  amenities: Amenity[];
  selectedAmenityIds: string[];
  error: string | null;
  isLoading: boolean;
  isSaving: boolean;
  isDirty: boolean;
  onToggle: (amenityId: string) => void;
  onReset: () => void;
  onCancel: () => void;
  onSave: () => void;
};

export default function PropertyAmenityAssignmentForm({
  property,
  amenities,
  selectedAmenityIds,
  error,
  isLoading,
  isSaving,
  isDirty,
  onToggle,
  onReset,
  onCancel,
  onSave,
}: Props) {
  return (
    <div className="space-y-5">
      <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
        <div className="text-sm font-semibold text-slate-900">
          {property.name}
        </div>
        <div className="text-sm text-slate-500">
          {property.city}, {property.state}
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      )}

      {isLoading ? (
        <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-sm text-slate-500">
          Loading amenities...
        </div>
      ) : amenities.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-sm text-slate-500">
          No active amenities available.
        </div>
      ) : (
        <div className="flex max-h-[46vh] flex-wrap gap-3 overflow-y-auto p-1">
          {amenities.map((amenity) => {
            const Icon = resolveIcon(amenity.icon);
            const isSelected = selectedAmenityIds.includes(amenity.id);

            return (
              <button
                key={amenity.id}
                type="button"
                onClick={() => onToggle(amenity.id)}
                className={`group inline-flex min-h-10 items-center gap-2 rounded-lg border px-4 py-2 text-sm leading-5 transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                  isSelected
                    ? "border-indigo-500 bg-indigo-50 text-indigo-700 shadow-sm"
                    : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                }`}
              >
                {Icon && (
                  <Icon
                    className={
                      isSelected
                        ? "text-indigo-600"
                        : "text-slate-500 group-hover:text-slate-700"
                    }
                    size={18}
                  />
                )}
                <span className="font-medium leading-5">{amenity.name}</span>
              </button>
            );
          })}
        </div>
      )}

      <div className="sticky bottom-0 flex flex-col gap-3 border-t border-slate-200 bg-white pt-4 sm:flex-row">
        <Button type="button" onClick={onSave} disabled={!isDirty || isSaving}>
          {isSaving ? "Saving..." : "Save Amenities"}
        </Button>
        <Button
          type="button"
          variant="dark"
          onClick={onReset}
          disabled={!isDirty || isSaving}
        >
          Reset
        </Button>
        <Button type="button" variant="dark" onClick={onCancel} disabled={isSaving}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
