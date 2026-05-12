import { useState, useEffect, useRef, type ReactNode } from "react";

export type CardSplitProps = {
  children: ReactNode;
  image?: ReactNode | string;
  imageSide?: "left" | "right";
  aspectRatio?: "16/9" | "4/3" | "1/1" | "auto" | string;
  className?: string;
  imageClassName?: string;
  containerClassName?: string;
  animation?: boolean;
};

/* aspect ratio utility */
const aspectRatioMap: Record<string, string> = {
  "16/9": "aspect-[16/9]",
  "4/3": "aspect-[4/3]",
  "1/1": "aspect-square",
  auto: "h-72",
};

export default function CardSplit({
  children,
  image,
  imageSide = "left",
  aspectRatio = "auto",
  className = "",
  imageClassName = "",
  containerClassName = "",
  animation = true,
}: CardSplitProps) {
  const isLeft = imageSide === "left";

  /* animation */
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const [visible, setVisible] = useState(!animation);

  useEffect(() => {
    if (!animation) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.15 }
    );

    if (wrapperRef.current) observer.observe(wrapperRef.current);
    return () => observer.disconnect();
  }, [animation]);

  const animClass = animation
    ? visible
      ? "opacity-100 translate-y-0 transition-all duration-700"
      : "opacity-0 translate-y-4"
    : "";

  /* pre-render blocks */
  const ImageEl = (
    <ImageBlock
      image={image}
      aspectRatio={aspectRatio}
      className={imageClassName}
    />
  );

  const ContentEl = <div className={containerClassName}>{children}</div>;

  return (
    <div
      ref={wrapperRef}
      className={`md:grid md:grid-cols-2 gap-10 items-center ${animClass} ${className}`}
    >
      {/* -------- MOBILE (always: image → content) -------- */}
      <div className="flex flex-col gap-6 md:hidden">
        {ImageEl}
        {ContentEl}
      </div>

      {/* -------- DESKTOP (left/right split) -------- */}
      {isLeft && <div className="hidden md:block">{ImageEl}</div>}

      <div className="hidden md:block">{ContentEl}</div>

      {!isLeft && <div className="hidden md:block">{ImageEl}</div>}
    </div>
  );
}

function ImageBlock({
  image,
  aspectRatio,
  className,
}: {
  image?: ReactNode | string;
  aspectRatio: string;
  className?: string;
}) {
  const [loaded, setLoaded] = useState(false);
  const isUrl = typeof image === "string";

  const ratioClass = aspectRatioMap[aspectRatio] || `aspect-[${aspectRatio}]`;

  return (
    <div
      className={`group rounded-2xl overflow-hidden bg-surface-3 shadow ${ratioClass} relative flex items-center justify-center ${className}`}
    >
      {!loaded && (
        <div className="absolute inset-0 bg-surface-2 animate-pulse" />
      )}

      {image ? (
        isUrl ? (
          <img
            src={image}
            alt="Card visual"
            className={`w-full h-full object-cover transition-all duration-500
              ${loaded ? "opacity-100" : "opacity-0"}
              ${loaded ? "group-hover:scale-105" : ""}
            `}
            onLoad={() => setLoaded(true)}
          />
        ) : (
          <div
            className="w-full h-full transition-all duration-500 group-hover:scale-105"
            onLoad={() => setLoaded(true)}
          >
            {image}
          </div>
        )
      ) : (
        <div className="text-muted text-xs opacity-70">Image placeholder</div>
      )}
    </div>
  );
}
