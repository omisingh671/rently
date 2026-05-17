import { create } from "zustand";
import { persist } from "zustand/middleware";

type CurrentPropertyState = {
  selectedPropertyId: string | null;
  setSelectedPropertyId: (propertyId: string | null) => void;
  clearSelectedPropertyId: () => void;
};

export const useCurrentPropertyStore = create<CurrentPropertyState>()(
  persist(
    (set) => ({
      selectedPropertyId: null,
      setSelectedPropertyId: (propertyId) =>
        set({ selectedPropertyId: propertyId }),
      clearSelectedPropertyId: () => set({ selectedPropertyId: null }),
    }),
    {
      name: "current-property",
    },
  ),
);
