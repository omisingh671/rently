import ActiveToggle from "@/components/common/ActiveToggle";
import StatusBadge from "@/components/common/StatusBadge";
import Button from "@/components/ui/Button";
import type { ProductForm } from "@/features/pricing/pricingPage.helpers";
import type {
  AdminRoomProduct,
  RoomProductCategory,
} from "@/features/pricing/types";
import { PricingFormHeader } from "./PricingFormHeader";
import PricingTable from "./PricingTable";
import {
  actionRowClass,
  fieldClass,
  formCardClass,
  formGridClass,
  inputClass,
  pricingSectionGridClass,
} from "./pricingSectionStyles";

interface PricingProductsSectionProps {
  form: ProductForm;
  editingProduct: AdminRoomProduct | null;
  products: AdminRoomProduct[];
  isFetching: boolean;
  isMutating: boolean;
  onGuide: () => void;
  onNameChange: (name: string) => void;
  onOccupancyChange: (occupancy: number) => void;
  onCategoryChange: (category: RoomProductCategory) => void;
  onHasACChange: (hasAC: boolean) => void;
  onSubmit: () => void;
  onCancel: () => void;
  onEdit: (product: AdminRoomProduct) => void;
}

export function PricingProductsSection({
  form,
  editingProduct,
  products,
  isFetching,
  isMutating,
  onGuide,
  onNameChange,
  onOccupancyChange,
  onCategoryChange,
  onHasACChange,
  onSubmit,
  onCancel,
  onEdit,
}: PricingProductsSectionProps) {
  return (
    <section className={pricingSectionGridClass}>
      <div className={formCardClass}>
        <PricingFormHeader
          title={editingProduct ? "Edit Rate Product" : "Create Rate Product"}
          guideLabel="Product Guide"
          onGuide={onGuide}
        />
        <p className="mt-3 text-sm text-slate-500">
          Define reusable internal pricing types such as Single AC, Double
          Non-AC, or Whole Unit AC.
        </p>
        <div className={formGridClass}>
          <label className={`${fieldClass} sm:col-span-2`}>
            <span>Rate Product Name</span>
            <input
              value={form.name}
              onChange={(event) => onNameChange(event.target.value)}
              placeholder="Example: Single AC"
              className={inputClass}
            />
          </label>
          <label className={fieldClass}>
            <span>Occupancy</span>
            <input
              value={form.occupancy}
              onChange={(event) =>
                onOccupancyChange(Number(event.target.value))
              }
              type="number"
              min={1}
              placeholder="Guests covered"
              className={inputClass}
            />
          </label>
          <label className={fieldClass}>
            <span>Product Category</span>
            <select
              value={form.category}
              onChange={(event) =>
                onCategoryChange(event.target.value as RoomProductCategory)
              }
              className={inputClass}
            >
              <option value="NIGHTLY">Nightly</option>
              <option value="LONG_STAY">Long stay</option>
              <option value="CORPORATE">Corporate</option>
            </select>
          </label>
          <div className="flex items-center justify-between rounded-md border border-slate-200 bg-slate-50 px-3 py-2.5 sm:col-span-2">
            <span className="text-sm font-medium text-slate-700">
              AC rate product
            </span>
            <ActiveToggle checked={form.hasAC} onChange={onHasACChange} />
          </div>
          <div className={actionRowClass}>
            <Button disabled={isMutating} onClick={onSubmit}>
              {editingProduct ? "Save Rate Product" : "Create Rate Product"}
            </Button>
            {editingProduct && (
              <Button variant="dark" onClick={onCancel}>
                Cancel
              </Button>
            )}
          </div>
        </div>
      </div>

      <PricingTable
        headers={["Name", "Occupancy", "Category", "Type", "Action"]}
        loading={isFetching}
        empty={products.length === 0}
      >
        {products.map((product) => (
          <tr
            key={product.id}
            className="border-t border-slate-200 hover:bg-slate-50 transition-colors"
          >
            <td className="px-4 py-3 font-medium">{product.name}</td>
            <td className="px-4 py-3">{product.occupancy}</td>
            <td className="px-4 py-3">
              <StatusBadge status={product.category} />
            </td>
            <td className="px-4 py-3">
              {product.hasAC ? "AC" : "Non-AC"}
            </td>
            <td className="px-4 py-3">
              <button
                className="text-indigo-600 hover:underline"
                onClick={() => onEdit(product)}
              >
                Edit
              </button>
            </td>
          </tr>
        ))}
      </PricingTable>
    </section>
  );
}
