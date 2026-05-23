import React, { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { FiUploadCloud, FiTrash2, FiImage, FiX, FiTag } from "react-icons/fi";
import { AxiosError } from "axios";
import { API_BASE_URL } from "@/configs/appConfig";
import { useCurrentProperty } from "@/features/properties/hooks/useCurrentProperty";
import { useAdminGallery } from "@/features/gallery/hooks/useAdminGallery";
import { ADMIN_KEYS } from "@/features/config/adminKeys";
import { listUnitsApi } from "@/features/units/api";
import { listRoomsApi } from "@/features/rooms/api";
import type { AdminUnit } from "@/features/units/types";
import type { AdminRoom } from "@/features/rooms/types";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";

function usePropertyUnits(propertyId: string) {
  return useQuery<AdminUnit[]>({
    queryKey: propertyId
      ? ADMIN_KEYS.units.list({ propertyId, page: 1, limit: 100, isActive: true })
      : ADMIN_KEYS.units.all(),
    queryFn: async () => {
      const data = await listUnitsApi(propertyId, {
        page: 1,
        limit: 100,
        isActive: true,
      });
      return data.items;
    },
    enabled: !!propertyId,
  });
}

function usePropertyRooms(propertyId: string) {
  return useQuery<AdminRoom[]>({
    queryKey: propertyId
      ? ADMIN_KEYS.rooms.list({ propertyId, page: 1, limit: 100, isActive: true })
      : ADMIN_KEYS.rooms.all(),
    queryFn: async () => {
      const data = await listRoomsApi(propertyId, {
        page: 1,
        limit: 100,
        isActive: true,
      });
      return data.items;
    },
    enabled: !!propertyId,
  });
}

const resolveAssetUrl = (url: string) => {
  if (/^(https?:|data:|blob:)/i.test(url)) {
    return url;
  }

  if (url.startsWith("/")) {
    return `${API_BASE_URL}${url}`;
  }

  return url;
};

export default function GalleryPage() {
  const {
    properties,
    selectedPropertyId,
    setSelectedPropertyId,
  } = useCurrentProperty();

  // Uploader Form States
  const [uploadPropId, setUploadPropId] = useState(selectedPropertyId || "");
  const [uploadUnitId, setUploadUnitId] = useState("");
  const [uploadRoomId, setUploadRoomId] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [formError, setFormError] = useState("");
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  // Gallery Filters States
  const [filterPropId, setFilterPropId] = useState(selectedPropertyId || "");
  const [filterUnitId, setFilterUnitId] = useState("");
  const [filterRoomId, setFilterRoomId] = useState("");

  // Sync selectedPropertyId to local states
  useEffect(() => {
    if (selectedPropertyId) {
      setUploadPropId((prev) => (prev !== selectedPropertyId ? selectedPropertyId : prev));
      setFilterPropId((prev) => (prev !== selectedPropertyId ? selectedPropertyId : prev));
    }
  }, [selectedPropertyId]);

  useEffect(() => {
    setUploadUnitId("");
    setUploadRoomId("");
  }, [uploadPropId]);

  useEffect(() => {
    setFilterUnitId("");
    setFilterRoomId("");
  }, [filterPropId]);

  // Fetching relationships
  const { data: uploadUnits = [], isLoading: isLoadingUnits } = usePropertyUnits(uploadPropId);
  const { data: uploadRooms = [], isLoading: isLoadingRooms } = usePropertyRooms(uploadPropId);

  const { data: filterUnits = [] } = usePropertyUnits(filterPropId);
  const { data: filterRooms = [] } = usePropertyRooms(filterPropId);

  // Filtered rooms lists
  const uploadFilteredRooms = useMemo(() => {
    if (!uploadUnitId) return [];
    return uploadRooms.filter((r: AdminRoom) => r.unitId === uploadUnitId);
  }, [uploadRooms, uploadUnitId]);

  const filterFilteredRooms = useMemo(() => {
    if (!filterUnitId) return [];
    return filterRooms.filter((r: AdminRoom) => r.unitId === filterUnitId);
  }, [filterRooms, filterUnitId]);

  // Gallery queries / mutations
  const galleryFilters = useMemo(() => ({
    ...(filterPropId && { propertyId: filterPropId }),
    ...(filterUnitId && { unitId: filterUnitId }),
    ...(filterRoomId && { roomId: filterRoomId }),
  }), [filterPropId, filterUnitId, filterRoomId]);

  const {
    data: galleryItems = [],
    isLoading: isLoadingGallery,
    uploadAndCreate,
    isUploading,
    deleteGallery,
    isDeleting,
  } = useAdminGallery(galleryFilters);

  // File Picker Handling
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setFormError("");
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.type.startsWith("image/")) {
        setSelectedFile(file);
        setPreviewUrl(URL.createObjectURL(file));
        setFormError("");
      } else {
        setFormError("Only image files are supported");
      }
    }
  };

  const clearFile = () => {
    setSelectedFile(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
  };

  // Submit Uploader
  const handleUploadSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");

    if (!uploadPropId) {
      setFormError("Target property is required");
      return;
    }

    if (!selectedFile) {
      setFormError("Please select an image file to upload");
      return;
    }

    uploadAndCreate(
      {
        propertyId: uploadPropId,
        unitId: uploadUnitId || null,
        roomId: uploadRoomId || null,
        file: selectedFile,
      },
      {
        onSuccess: () => {
          clearFile();
          setUploadUnitId("");
          setUploadRoomId("");
        },
        onError: (err: unknown) => {
          const axiosErr = err as AxiosError<{ error?: { message?: string } }>;
          setFormError(axiosErr?.response?.data?.error?.message ?? "Failed to upload image");
        },
      }
    );
  };

  const handleConfirmDelete = () => {
    if (!deleteTargetId) return;

    deleteGallery(deleteTargetId, {
      onSuccess: () => setDeleteTargetId(null),
    });
  };

  const activePropertyOptions = useMemo(() => properties ?? [], [properties]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: File Uploader Form */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-6 h-fit">
          <h2 className="text-base font-semibold text-slate-900 flex items-center gap-2">
            <FiUploadCloud className="h-5 w-5 text-indigo-600" />
            Upload New Asset
          </h2>

          <form onSubmit={handleUploadSubmit} className="space-y-5">
            {formError && (
              <div className="p-3 text-xs bg-rose-50 border border-rose-100 rounded-lg text-rose-600">
                {formError}
              </div>
            )}

            {/* Target Selection Fields */}
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">Target Property *</label>
                <select
                  value={uploadPropId}
                  onChange={(e) => {
                    const val = e.target.value;
                    setUploadPropId(val);
                    setUploadUnitId("");
                    setUploadRoomId("");
                    if (val) {
                      setSelectedPropertyId(val);
                    }
                  }}
                  className="w-full text-sm rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="">Select Property</option>
                  {activePropertyOptions.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">Target Unit (Optional)</label>
                <select
                  value={uploadUnitId}
                  disabled={!uploadPropId || isLoadingUnits}
                  onChange={(e) => {
                    setUploadUnitId(e.target.value);
                    setUploadRoomId("");
                  }}
                  className="w-full text-sm rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 disabled:opacity-50"
                >
                  <option value="">Property-Wide Image (No Unit)</option>
                  {uploadUnits.map((u: AdminUnit) => (
                    <option key={u.id} value={u.id}>Unit {u.unitNumber} (Floor {u.floor})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">Target Room (Optional)</label>
                <select
                  value={uploadRoomId}
                  disabled={!uploadUnitId || isLoadingRooms}
                  onChange={(e) => setUploadRoomId(e.target.value)}
                  className="w-full text-sm rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 disabled:opacity-50"
                >
                  <option value="">Unit-Wide Image (No Room)</option>
                  {uploadFilteredRooms.map((r: AdminRoom) => (
                    <option key={r.id} value={r.id}>Room {r.number} ({r.name})</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Drag & Drop File Upload Area */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">Image Asset *</label>
              
              {!previewUrl ? (
                <div
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                  className="border-2 border-dashed border-slate-300 rounded-xl p-8 flex flex-col items-center justify-center cursor-pointer hover:border-indigo-500 hover:bg-indigo-50/10 transition"
                  onClick={() => document.getElementById("file-upload-input")?.click()}
                >
                  <FiUploadCloud className="h-10 w-10 text-slate-400 mb-3" />
                  <span className="text-sm font-medium text-slate-700">Drag & drop image, or <span className="text-indigo-600 hover:underline">browse</span></span>
                  <span className="text-xs text-slate-400 mt-1">PNG, JPG, JPEG up to 10MB</span>
                  <input
                    id="file-upload-input"
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </div>
              ) : (
                <div className="relative border border-slate-200 rounded-xl overflow-hidden bg-slate-50">
                  <img
                    src={previewUrl}
                    alt="Upload Preview"
                    className="w-full h-48 object-cover"
                  />
                  <div className="absolute inset-0 bg-slate-900/40 opacity-0 hover:opacity-100 transition flex items-center justify-center">
                    <button
                      type="button"
                      onClick={clearFile}
                      className="p-2 bg-white rounded-full text-rose-600 shadow hover:scale-110 transition"
                    >
                      <FiTrash2 className="h-5 w-5" />
                    </button>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-white border-t border-slate-100">
                    <span className="text-xs font-medium text-slate-600 truncate max-w-[200px]">
                      {selectedFile?.name}
                    </span>
                    <button
                      type="button"
                      onClick={clearFile}
                      className="text-slate-400 hover:text-slate-600"
                    >
                      <FiX className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>

            <Button
              type="submit"
              className="w-full justify-center"
              disabled={isUploading}
            >
              {isUploading ? "Uploading & Saving..." : "Upload Asset"}
            </Button>
          </form>
        </div>

        {/* Right Columns: Gallery Grid & Filtering */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Filtering Header Card */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex flex-col md:flex-row gap-4 items-center justify-between">
            <span className="text-sm font-semibold text-slate-800 shrink-0">Filter Gallery:</span>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full">
              <select
                value={filterPropId}
                onChange={(e) => {
                  const val = e.target.value;
                  setFilterPropId(val);
                  setFilterUnitId("");
                  setFilterRoomId("");
                  if (val) {
                    setSelectedPropertyId(val);
                  }
                }}
                className="text-sm rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-slate-900 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              >
                <option value="">All Properties</option>
                {activePropertyOptions.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>

              <select
                value={filterUnitId}
                disabled={!filterPropId}
                onChange={(e) => {
                  setFilterUnitId(e.target.value);
                  setFilterRoomId("");
                }}
                className="text-sm rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-slate-900 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 disabled:opacity-50"
              >
                <option value="">All Units</option>
                {filterUnits.map((u: AdminUnit) => (
                  <option key={u.id} value={u.id}>Unit {u.unitNumber}</option>
                ))}
              </select>

              <select
                value={filterRoomId}
                disabled={!filterUnitId}
                onChange={(e) => setFilterRoomId(e.target.value)}
                className="text-sm rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-slate-900 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 disabled:opacity-50"
              >
                <option value="">All Rooms</option>
                {filterFilteredRooms.map((r: AdminRoom) => (
                  <option key={r.id} value={r.id}>Room {r.number}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Grid Displays */}
          {isLoadingGallery ? (
            <div className="flex flex-col items-center justify-center p-20 bg-white rounded-xl border border-slate-200">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-300 border-t-indigo-600"></div>
              <span className="text-sm text-slate-500 mt-4">Loading gallery assets...</span>
            </div>
          ) : galleryItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-20 bg-white rounded-xl border border-slate-200 text-center">
              <FiImage className="h-12 w-12 text-slate-300 mb-3" />
              <h3 className="text-sm font-semibold text-slate-800">No images found</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-xs">Upload property, unit, or room images on the left to start building your gallery.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
              {galleryItems.map((item) => (
                <div
                  key={item.id}
                  className="group bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden relative flex flex-col hover:shadow-md transition duration-300"
                >
                  {/* Image Container */}
                  <div className="relative h-44 w-full bg-slate-50 overflow-hidden shrink-0">
                    <img
                      src={resolveAssetUrl(item.url)}
                      alt="Gallery Asset"
                      className="h-full w-full object-cover group-hover:scale-105 transition-all duration-500"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = "https://placehold.co/300x200?text=Image+Not+Found";
                      }}
                    />
                    
                    {/* Delete Action Button Overlay */}
                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition duration-200">
                      <button
                        onClick={() => setDeleteTargetId(item.id)}
                        className="p-1.5 bg-white rounded-lg shadow text-rose-600 hover:bg-rose-50 hover:scale-105 transition"
                        title="Delete Image"
                      >
                        <FiTrash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  {/* Metadata Tags */}
                  <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                    <div className="space-y-1">
                      <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Property</h4>
                      <p className="text-sm font-medium text-slate-800 truncate">{item.propertyName}</p>
                    </div>

                    <div className="flex flex-wrap gap-1.5 pt-1">
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100">
                        <FiTag className="h-3 w-3" />
                        Property
                      </span>

                      {item.unitNumber && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-100">
                          Unit {item.unitNumber}
                        </span>
                      )}

                      {item.roomNumber && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100">
                          Room {item.roomNumber}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

      <Modal
        isOpen={deleteTargetId !== null}
        onClose={() => setDeleteTargetId(null)}
        title="Delete gallery image"
        size="sm"
        disableBackdropClose={isDeleting}
        disableEscapeClose={isDeleting}
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            This image will be removed from the gallery and storage.
          </p>
          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="secondary"
              disabled={isDeleting}
              onClick={() => setDeleteTargetId(null)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="danger"
              disabled={isDeleting}
              onClick={handleConfirmDelete}
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
