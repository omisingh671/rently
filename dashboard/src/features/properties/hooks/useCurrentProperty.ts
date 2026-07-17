import { useEffect, useMemo } from "react";
import { useActiveProperties } from "./useActiveProperties";
import { useCurrentPropertyStore } from "@/stores/currentPropertyStore";

export const useCurrentProperty = () => {
  const selectedPropertyId = useCurrentPropertyStore(
    (state) => state.selectedPropertyId,
  );
  const hasHydrated = useCurrentPropertyStore((state) => state.hasHydrated);
  const setSelectedPropertyId = useCurrentPropertyStore(
    (state) => state.setSelectedPropertyId,
  );
  const clearSelectedPropertyId = useCurrentPropertyStore(
    (state) => state.clearSelectedPropertyId,
  );

  const propertiesQuery = useActiveProperties(selectedPropertyId);
  const properties = useMemo(
    () => propertiesQuery.data ?? [],
    [propertiesQuery.data],
  );
  const isSelectionReady = hasHydrated && !propertiesQuery.isPending;

  useEffect(() => {
    if (!isSelectionReady) return;

    if (properties.length === 0) {
      if (selectedPropertyId !== null) {
        clearSelectedPropertyId();
      }
      return;
    }

    const selectedIsAccessible =
      selectedPropertyId !== null &&
      properties.some((property) => property.id === selectedPropertyId);

    if (!selectedIsAccessible) {
      setSelectedPropertyId(properties[0]?.id ?? null);
    }
  }, [
    clearSelectedPropertyId,
    isSelectionReady,
    properties,
    selectedPropertyId,
    setSelectedPropertyId,
  ]);

  const effectivePropertyId =
    isSelectionReady
      ? (properties.some((property) => property.id === selectedPropertyId)
        ? selectedPropertyId
        : properties[0]?.id)
      : undefined;

  const selectedProperty =
    properties.find((property) => property.id === effectivePropertyId) ?? null;

  return {
    properties,
    selectedProperty,
    selectedPropertyId: effectivePropertyId ?? "",
    setSelectedPropertyId,
    clearSelectedPropertyId,
    isLoading: !hasHydrated || propertiesQuery.isPending,
    isFetching: propertiesQuery.isFetching,
    isError: propertiesQuery.isError,
    hasProperties: properties.length > 0,
  };
};
