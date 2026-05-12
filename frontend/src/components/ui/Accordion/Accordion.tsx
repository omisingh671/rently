"use client";

import { useState } from "react";
import { RiArrowDownSLine } from "react-icons/ri";
import clsx from "clsx";

export interface AccordionItem {
  id: string;
  title: string;
  content: React.ReactNode;
}

type AccordionVariant = "neutral" | "primary" | "accent";

interface AccordionProps {
  items: AccordionItem[];
  defaultOpenIndex?: number;
  variant?: AccordionVariant;
}

const VARIANT_STYLES: Record<
  AccordionVariant,
  {
    border: string;
    openBg: string;
    divider: string;
    icon: string;
    hover: string;
  }
> = {
  neutral: {
    border: "border-slate-200 dark:border-white/10",
    openBg: "bg-surface-2",
    divider: "bg-slate-500/50 dark:bg-white/10",
    icon: "text-muted",
    hover: "hover:bg-slate-50 dark:hover:bg-white/5 hover:border-slate-300",
  },
  primary: {
    border: "border-primary/30",
    openBg: "bg-primary/5",
    divider: "bg-primary/50",
    icon: "text-primary",
    hover: "hover:bg-primary/5 hover:border-primary/50",
  },
  accent: {
    border: "border-accent/30",
    openBg: "bg-accent/5",
    divider: "bg-accent/50",
    icon: "text-accent",
    hover: "hover:bg-accent/5 hover:border-accent/50",
  },
};

export default function Accordion({
  items,
  defaultOpenIndex = 0,
  variant = "neutral",
}: AccordionProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(
    defaultOpenIndex ?? null
  );

  const styles = VARIANT_STYLES[variant];

  return (
    <div className="space-y-4">
      {items.map((item, index) => {
        const isOpen = openIndex === index;

        return (
          <div
            key={item.id}
            className={clsx(
              "rounded-xl border transition-colors duration-200",
              styles.border,
              styles.hover,
              isOpen && styles.openBg
            )}
          >
            <button
              type="button"
              onClick={() => setOpenIndex(isOpen ? null : index)}
              className="w-full text-left p-5 cursor-pointer"
            >
              <div className="flex items-center justify-between">
                <span className="heading heading-sm leading-snug">
                  {item.title}
                </span>

                <RiArrowDownSLine
                  className={clsx(
                    "text-xl transition-transform duration-200",
                    isOpen && "rotate-180",
                    styles.icon
                  )}
                />
              </div>

              {isOpen && (
                <div
                  className={clsx(
                    "mt-3 h-1 w-12 transition-opacity duration-200",
                    styles.divider,
                    "opacity-100"
                  )}
                />
              )}
            </button>

            <div className="accordion-content" data-open={isOpen}>
              <div className="accordion-inner">
                <div className="px-5 pb-6 text-[15px] leading-relaxed text-default/90">
                  {item.content}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
