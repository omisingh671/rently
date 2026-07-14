import Button from "@/components/ui/Button";
import { FiInfo } from "react-icons/fi";

interface PricingFormHeaderProps {
  title: string;
  guideLabel: string;
  onGuide: () => void;
}

export function PricingFormHeader({
  title,
  guideLabel,
  onGuide,
}: PricingFormHeaderProps) {
  return (
    <div className="flex items-center justify-between gap-3">
      <h2 className="text-base font-semibold text-slate-900">{title}</h2>
      <Button
        type="button"
        size="sm"
        variant="secondary"
        icon={<FiInfo />}
        onClick={onGuide}
      >
        {guideLabel}
      </Button>
    </div>
  );
}
