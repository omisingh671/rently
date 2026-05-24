import { useParams } from "react-router-dom";
import PropertyDetails from "@/features/properties/components/PropertyDetails";

export default function PropertyDetailsPage() {
  const { id } = useParams<{ id: string }>();

  if (!id) {
    return (
      <div className="rounded-xl bg-white p-4">
        <div className="text-rose-600">Invalid property ID</div>
      </div>
    );
  }

  return (
    <div className="rounded-xl bg-white p-4">
      <PropertyDetails id={id} />
    </div>
  );
}
