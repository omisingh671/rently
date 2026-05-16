import { useEffect, useMemo, useState } from "react";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import Pagination from "@/components/common/Pagination";
import PageSizeSelector from "@/components/common/PageSizeSelector";
import { useAdminListState } from "@/hooks/admin/useAdminListState";
import { useAdminProperties } from "@/features/properties/hooks/useAdminProperties";
import { ADMIN_OPTION_LIST_LIMIT } from "@/features/config/queryLimits";
import RoomsFilters from "@/features/rooms/components/RoomsFilters";
import RoomForm from "@/features/rooms/components/RoomForm/RoomForm";
import RoomsTable from "@/features/rooms/components/RoomsTable";
import { useAdminRooms } from "@/features/rooms/hooks/useAdminRooms";
import type { AdminRoom, RoomStatus } from "@/features/rooms/types";

type Filters = {
  propertyId: string;
  search: string;
  status: "" | RoomStatus;
  isActive: "" | "true" | "false";
};

export default function RoomsPage() {
  const {
    page,
    pageSize,
    filters,
    debouncedSearch,
    setPage,
    setPageSize,
    setFilters,
  } = useAdminListState<Filters>({
    propertyId: "",
    search: "",
    status: "",
    isActive: "",
  });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState<AdminRoom | null>(null);

  const {
    data: propertiesData,
    isPending: isLoadingProperties,
    isError: isPropertiesError,
  } = useAdminProperties(1, ADMIN_OPTION_LIST_LIMIT, {
    search: "",
    status: "",
    isActive: "true",
  });
  const properties = useMemo(
    () => propertiesData?.items ?? [],
    [propertiesData?.items],
  );

  useEffect(() => {
    if (!filters.propertyId && properties.length > 0) {
      setFilters((prev) => ({
        ...prev,
        propertyId: properties[0].id,
      }));
    }
  }, [filters.propertyId, properties, setFilters]);

  useEffect(() => {
    setPage(1);
  }, [filters.propertyId, filters.status, filters.isActive, setPage]);

  const {
    data,
    isPending,
    isFetching,
    isError,
    createRoom,
    updateRoom,
    isCreating,
    isUpdating,
  } = useAdminRooms(filters.propertyId, page, pageSize, {
    search: debouncedSearch,
    status: filters.status,
    isActive: filters.isActive,
  });

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingRoom(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col justify-between gap-4 lg:flex-row">
        <RoomsFilters
          properties={properties}
          propertyId={filters.propertyId}
          search={filters.search}
          status={filters.status}
          isActive={filters.isActive}
          onChange={(next) => setFilters(next)}
        />

        <Button
          disabled={!filters.propertyId || isLoadingProperties || isPropertiesError}
          onClick={() => {
            setEditingRoom(null);
            setIsModalOpen(true);
          }}
        >
          Create Room
        </Button>
      </div>

      <RoomsTable
        items={data?.items}
        page={page}
        pageSize={pageSize}
        search={debouncedSearch}
        isPending={Boolean(filters.propertyId) && isPending}
        isFetching={isFetching}
        isError={isError}
        emptyMessage={
          !filters.propertyId
            ? "Select a property to view rooms."
            : "No rooms found for this property."
        }
        isUpdating={isUpdating}
        onUpdate={(args) => {
          void updateRoom(args);
        }}
        onEdit={(room) => {
          setEditingRoom(room);
          setIsModalOpen(true);
        }}
      />

      {data?.pagination && data.pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <PageSizeSelector value={pageSize} onChange={setPageSize} />
          <Pagination
            page={data.pagination.page}
            totalPages={data.pagination.totalPages}
            onPageChange={setPage}
          />
        </div>
      )}

      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        disableBackdropClose
        disableEscapeClose
        title={editingRoom ? "Edit Room" : "Create Room"}
        size="xl"
      >
        <RoomForm
          properties={properties}
          submitLabel={editingRoom ? "Save Changes" : "Create Room"}
          isEditing={!!editingRoom}
          defaultValues={
            editingRoom
              ? {
                  propertyId: editingRoom.propertyId,
                  unitId: editingRoom.unitId,
                  name: editingRoom.name,
                  number: editingRoom.number,
                  rent: editingRoom.rent,
                  hasAC: editingRoom.hasAC,
                  maxOccupancy: editingRoom.maxOccupancy,
                  status: editingRoom.status,
                  isActive: editingRoom.isActive,
                  amenityIds: editingRoom.amenityIds,
                }
              : {
                  propertyId: filters.propertyId,
                  unitId: "",
                  name: "",
                  number: "",
                  rent: 1,
                  hasAC: false,
                  maxOccupancy: 2,
                  status: "AVAILABLE",
                  isActive: true,
                  amenityIds: [],
                }
          }
          isSubmitting={isCreating || isUpdating}
          onSubmit={(values, setServerError) => {
            const action = editingRoom
              ? updateRoom({ roomId: editingRoom.id, payload: values })
              : createRoom(values);

            action
              .then(() => handleCloseModal())
              .catch(() => {
                setServerError(
                  editingRoom ? "Failed to update room" : "Failed to create room",
                );
              });
          }}
          onCancel={handleCloseModal}
        />
      </Modal>
    </div>
  );
}
