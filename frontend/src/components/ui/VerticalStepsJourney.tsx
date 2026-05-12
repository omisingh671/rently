"use client";

import React, { useMemo, useState } from "react";
import { FiCpu, FiChevronDown, FiChevronUp } from "react-icons/fi";

export type RawStep = {
  id: string | number;
  title: string;
  subtitle?: string;
  detail?: string | React.ReactNode;
  weeks?: string;
  media?: React.ReactNode | string;
};

type Palette = Partial<{
  line: string; // vertical timeline color
  border: string; // card border color
  nodeBorder: string; // node outer border
  nodeBg: string; // outer node background
  iconBg: string; // icon inner bg
  iconColor: string; // icon color
  titleColor: string; // title text color
  subtitleColor: string; // subtitle text color
  cardBg: string; // card background
}>;

type Props = {
  heading?: string;
  data: RawStep[];
  className?: string;
  iconMap?: Record<string, React.ReactNode>;
  palette?: Palette;
};

const NODE_RADIUS = 64;

const DEFAULT_ICON_MAP: Record<string, React.ReactNode> = {
  cpu: <FiCpu className="w-6 h-6" />,
};

function isUrlString(str: string) {
  return /^(\/|https?:\/\/|data:)/.test(str);
}

export default function VerticalStepsJourney({
  data,
  className = "",
  iconMap = {},
  palette = {},
}: Props) {
  const [openId, setOpenId] = useState<string | number | null>(null);
  const mergedIcons = useMemo(
    () => ({ ...DEFAULT_ICON_MAP, ...iconMap }),
    [iconMap]
  );

  const DEFAULT_PALETTE: Required<Palette> = {
    line: "#E6EEF8",
    border: "#E6EEF8",
    nodeBorder: "#EEF2FF",
    nodeBg: "#FFFFFF",
    iconBg: "#EEF2FF", // indigo-50
    iconColor: "#4f39f6", // indigo-700
    titleColor: "#4f39f6", // indigo-700
    subtitleColor: "#374151", // slate-700
    cardBg: "#FFFFFF",
  };

  const mergedPalette = { ...DEFAULT_PALETTE, ...palette };

  if (!Array.isArray(data) || data.length === 0) {
    console.error("VerticalStepsJourney: `data` must be a non-empty array.");
    return null;
  }

  const resolveMedia = (media?: React.ReactNode | string) => {
    if (React.isValidElement(media)) return media;

    if (typeof media === "string") {
      if (isUrlString(media))
        return (
          <img
            src={media}
            alt=""
            width={24}
            height={24}
            className="w-full h-full object-cover rounded-full"
          />
        );
      if (mergedIcons[media]) return mergedIcons[media];
      return <span className="text-base font-semibold">{media}</span>;
    }

    return <FiCpu className="w-6 h-6" />;
  };

  const calcLeft = `${NODE_RADIUS / 2}px`;

  // CSS variables to allow tailwind classes to remain untouched
  const rootStyle: React.CSSProperties = {
    ["--vsj-line"]: mergedPalette.line,
    ["--vsj-border"]: mergedPalette.border,
    ["--vsj-node-border"]: mergedPalette.nodeBorder,
    ["--vsj-node-bg"]: mergedPalette.nodeBg,
    ["--vsj-icon-bg"]: mergedPalette.iconBg,
    ["--vsj-icon-color"]: mergedPalette.iconColor,
    ["--vsj-title"]: mergedPalette.titleColor,
    ["--vsj-subtitle"]: mergedPalette.subtitleColor,
    ["--vsj-card-bg"]: mergedPalette.cardBg,
  } as unknown as React.CSSProperties;

  return (
    <div className={className} style={rootStyle}>
      <div className="relative">
        {/* vertical line */}
        <div
          aria-hidden
          className="absolute pointer-events-none z-0"
          style={{
            left: calcLeft,
            top: `${NODE_RADIUS / 2}px`,
            bottom: `${NODE_RADIUS / 2}px`,
            width: "1px",
            backgroundColor: "var(--vsj-line)",
          }}
        />

        <div className="space-y-6 relative z-10">
          {data.map((step) => {
            const isOpen = openId === step.id;
            const mediaNode = resolveMedia(step.media);

            return (
              <div
                key={step.id}
                className="grid grid-cols-[64px_1fr] items-center"
              >
                {/* node */}
                <div className="flex items-center z-20">
                  <div
                    className="w-16 h-16 rounded-full bg-white flex items-center justify-center"
                    style={{
                      border: `1px solid var(--vsj-node-border)`,
                      background: "var(--vsj-node-bg)",
                      boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
                    }}
                  >
                    <div
                      className="w-12 h-12 rounded-full flex items-center justify-center overflow-hidden"
                      style={{
                        background: "var(--vsj-icon-bg)",
                        color: "var(--vsj-icon-color)",
                      }}
                    >
                      {mediaNode}
                    </div>
                  </div>
                </div>

                {/* connector + card */}
                <div className="flex items-center">
                  <div
                    className="w-[30px] lg:w-[60px] border-t"
                    style={{ borderColor: "var(--vsj-line)" }}
                  />

                  <div className="flex-1">
                    <div
                      className="rounded-lg p-4 shadow-sm"
                      style={{
                        border: `1px solid var(--vsj-border)`,
                        background: "var(--vsj-card-bg)",
                      }}
                    >
                      <div className="flex justify-between gap-4">
                        <div>
                          <div className="flex gap-3 items-center">
                            <h3
                              className="text-xl font-semibold"
                              style={{ color: "var(--vsj-title)" }}
                            >
                              {step.title}
                            </h3>
                            {step.weeks && (
                              <span
                                className="text-xs px-2 py-1 rounded-md font-medium"
                                style={{
                                  background: "var(--vsj-icon-bg)",
                                  color: "var(--vsj-icon-color)",
                                }}
                              >
                                {step.weeks}
                              </span>
                            )}
                          </div>

                          {step.subtitle && (
                            <p
                              className="text-base md:text-lg mt-2"
                              style={{ color: "var(--vsj-subtitle)" }}
                            >
                              {step.subtitle}
                            </p>
                          )}

                          {step.detail && isOpen && (
                            <div
                              className="mt-3 text-base"
                              style={{ color: "var(--vsj-subtitle)" }}
                            >
                              {typeof step.detail === "string" ? (
                                <div
                                  dangerouslySetInnerHTML={{
                                    __html: step.detail,
                                  }}
                                />
                              ) : (
                                step.detail
                              )}
                            </div>
                          )}
                        </div>

                        <div>
                          {step.detail ? (
                            <button
                              onClick={() => setOpenId(isOpen ? null : step.id)}
                              className="inline-flex items-center gap-2 text-sm px-3 py-2 rounded-md font-medium transition-all duration-200 hover:shadow-sm active:scale-95"
                              style={{
                                background: "var(--vsj-icon-bg)",
                                color: "var(--vsj-icon-color)",
                              }}
                            >
                              {isOpen ? (
                                <>
                                  <FiChevronUp className="w-4 h-4" /> Close
                                </>
                              ) : (
                                <>
                                  <FiChevronDown className="w-4 h-4" /> Details
                                </>
                              )}
                            </button>
                          ) : (
                            <span className="opacity-0">.</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
