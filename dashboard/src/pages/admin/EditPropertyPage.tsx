import { useParams } from "react-router-dom";
import EditPropertyForm from "@/features/admin/properties/components/EditPropertyForm";

export default function EditPropertyPage() {
  const { id } = useParams<{ id: string }>();

  if (!id) {
    return (
      <div className="bg-white p-4 rounded-xl">
        <div className="text-rose-600">Invalid property ID</div>
      </div>
    );
  }

  return (
    <div className="bg-white p-4 rounded-xl">
      <EditPropertyForm id={id} />
    </div>
  );
}
