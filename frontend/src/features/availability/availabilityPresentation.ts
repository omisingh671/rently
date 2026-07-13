import type {
  AvailabilityOption,
  AvailabilityOptionGroup,
  AvailabilityResult,
  ComfortFilter,
  ComfortOption,
} from "./domain";

export const maxVisibleOptionCount = 12;

export const formatAvailabilityPrice = (price: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(price);

export const mergeAvailabilityResults = (
  results: AvailabilityResult[],
): AvailabilityResult => {
  const optionsById = new Map<string, AvailabilityOption>();

  for (const result of results) {
    for (const option of result.options) {
      optionsById.set(option.optionId, option);
    }
  }

  const options = [...optionsById.values()].sort(
    (left, right) =>
      left.spareCapacity - right.spareCapacity ||
      left.nightlyTotal - right.nightlyTotal ||
      left.itemCount - right.itemCount ||
      left.stayTotal - right.stayTotal,
  );

  return {
    available: options.length > 0,
    options,
  };
};

const comfortOrder: Record<ComfortOption, number> = {
  NON_AC: 0,
  AC: 1,
};

const comfortLabels: Record<ComfortOption, string> = {
  AC: "AC",
  NON_AC: "Non-AC",
};

const getTargetMix = (option: AvailabilityOption) =>
  option.items
    .map(
      (item) =>
        `${item.targetType}:${item.priceGuestCount}:${item.guestCount}`,
    )
    .join("+");

const getDisplayTitle = (option: AvailabilityOption) => option.title;

const getAvailabilityGroupKey = (option: AvailabilityOption) =>
  [
    option.propertyId,
    getDisplayTitle(option),
    option.optionType,
    option.itemLabel,
    option.includedLabel,
    option.items.map((item) => item.priceGuestCount).join("+"),
    option.guestSplit,
    option.itemCount,
    getTargetMix(option),
  ].join("|");

const sortOptions = (left: AvailabilityOption, right: AvailabilityOption) =>
  left.spareCapacity - right.spareCapacity ||
  left.nightlyTotal - right.nightlyTotal ||
  left.itemCount - right.itemCount ||
  left.stayTotal - right.stayTotal ||
  comfortOrder[left.comfortOption] - comfortOrder[right.comfortOption];

const sortGroups = (
  left: AvailabilityOptionGroup,
  right: AvailabilityOptionGroup,
) => sortOptions(left.variants[0]!, right.variants[0]!);

export const groupAvailabilityOptions = (
  options: AvailabilityOption[],
): AvailabilityOptionGroup[] => {
  const groupsByKey = new Map<string, AvailabilityOptionGroup>();

  for (const option of options) {
    const groupId = getAvailabilityGroupKey(option);
    const displayTitle = getDisplayTitle(option);
    const existingGroup = groupsByKey.get(groupId);

    if (!existingGroup) {
      groupsByKey.set(groupId, {
        groupId,
        displayTitle,
        variants: [option],
      });
      continue;
    }

    const existingVariantIndex = existingGroup.variants.findIndex(
      (variant) => variant.comfortOption === option.comfortOption,
    );

    if (existingVariantIndex === -1) {
      existingGroup.variants.push(option);
      existingGroup.variants.sort(sortOptions);
      continue;
    }

    const existingVariant = existingGroup.variants[existingVariantIndex];
    if (existingVariant && option.stayTotal < existingVariant.stayTotal) {
      existingGroup.variants[existingVariantIndex] = option;
      existingGroup.variants.sort(sortOptions);
    }
  }

  return [...groupsByKey.values()]
    .sort(sortGroups)
    .slice(0, maxVisibleOptionCount);
};

const getDefaultComfort = (
  group: AvailabilityOptionGroup,
  comfort: ComfortFilter,
): ComfortOption => {
  if (
    comfort !== "ALL" &&
    group.variants.some((variant) => variant.comfortOption === comfort)
  ) {
    return comfort;
  }

  return [...group.variants].sort(
    (left, right) =>
      left.stayTotal - right.stayTotal ||
      comfortOrder[left.comfortOption] - comfortOrder[right.comfortOption],
  )[0]!.comfortOption;
};

export const getSelectedComfort = (
  group: AvailabilityOptionGroup,
  comfort: ComfortFilter,
  selectedComfortByGroup: Record<string, ComfortOption>,
) => {
  const selectedComfort = selectedComfortByGroup[group.groupId];

  if (
    selectedComfort &&
    group.variants.some(
      (variant) => variant.comfortOption === selectedComfort,
    )
  ) {
    return selectedComfort;
  }

  return getDefaultComfort(group, comfort);
};

export const getSelectedOption = (
  group: AvailabilityOptionGroup,
  selectedComfort: ComfortOption,
): AvailabilityOption => {
  const option =
    group.variants.find(
      (variant) => variant.comfortOption === selectedComfort,
    ) ?? group.variants[0]!;

  return {
    ...option,
    title: group.displayTitle,
  };
};

const getPrimaryOption = (group: AvailabilityOptionGroup) =>
  group.variants[0]!;

const getOptionSectionTitle = (option: AvailabilityOption) =>
  option.spareCapacity > 0 ? "More spacious private options" : "Best matches";

export const groupVisibleOptionsForDisplay = (
  groups: AvailabilityOptionGroup[],
): Array<{ id: string; title: string; groups: AvailabilityOptionGroup[] }> => {
  const propertyIds = new Set(
    groups.map((group) => getPrimaryOption(group).propertyId),
  );

  if (propertyIds.size > 1) {
    const byProperty = new Map<string, AvailabilityOptionGroup[]>();

    for (const group of groups) {
      const option = getPrimaryOption(group);
      const propertyGroups = byProperty.get(option.propertyLabel) ?? [];
      propertyGroups.push(group);
      byProperty.set(option.propertyLabel, propertyGroups);
    }

    return [...byProperty.entries()].map(([title, propertyGroups]) => ({
      id: title,
      title,
      groups: propertyGroups,
    }));
  }

  const bySection = new Map<string, AvailabilityOptionGroup[]>();

  for (const group of groups) {
    const option = getPrimaryOption(group);
    const title = getOptionSectionTitle(option);
    const sectionGroups = bySection.get(title) ?? [];
    sectionGroups.push(group);
    bySection.set(title, sectionGroups);
  }

  return ["Best matches", "More spacious private options"]
    .map((title) => ({
      id: title,
      title,
      groups: bySection.get(title) ?? [],
    }))
    .filter((section) => section.groups.length > 0);
};

export const getComfortVariants = (group: AvailabilityOptionGroup) =>
  group.variants
    .map((variant) => ({
      comfortOption: variant.comfortOption,
      label: comfortLabels[variant.comfortOption],
      priceLabel: formatAvailabilityPrice(variant.nightlyTotal),
    }))
    .sort(
      (left, right) =>
        comfortOrder[left.comfortOption] - comfortOrder[right.comfortOption],
    );
