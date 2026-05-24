import { create } from "zustand";
import { persist } from "zustand/middleware";

type CurrentPropertyState = {
  selectedPropertyId: string | null;
  hasHydrated: boolean;
  setSelectedPropertyId: (propertyId: string | null) => void;
  clearSelectedPropertyId: () => void;
  setHasHydrated: (hasHydrated: boolean) => void;
};

export const useCurrentPropertyStore = create<CurrentPropertyState>()(
  persist(
    (set) => ({
      selectedPropertyId: null,
      hasHydrated: false,
      setSelectedPropertyId: (propertyId) =>
        set({ selectedPropertyId: propertyId }),
      clearSelectedPropertyId: () => set({ selectedPropertyId: null }),
      setHasHydrated: (hasHydrated) => set({ hasHydrated }),
    }),
    {
      name: "current-property",
      partialize: (state) => ({
        selectedPropertyId: state.selectedPropertyId,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    },
  ),
);
