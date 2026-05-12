import {
  FiUser,
  FiUsers,
  FiCheck,
  FiChevronRight,
  FiKey,
  FiTag,
  FiWind,
} from "react-icons/fi";

import Button from "@/components/ui/Button";
import type { RoomType } from "./types";

export function Skeleton() {
  return (
    <article className="bg-white rounded-2xl overflow-hidden border border-surface-3 animate-pulse md:flex md:items-stretch">
      {/* image / media placeholder */}
      <div className="w-full h-56 lg:h-auto lg:w-1/2 bg-surface-3" />

      {/* content placeholder */}
      <div className="p-6 lg:p-7 flex-1">
        <div className="h-4 w-32 bg-surface-3 rounded mb-3" />

        <div className="h-6 w-2/3 bg-surface-3 rounded mb-2" />
        <div className="h-4 w-24 bg-surface-3 rounded mb-4" />

        <div className="h-3 w-full bg-surface-3 rounded mb-3" />
        <div className="h-3 w-full bg-surface-3 rounded mb-3" />
        <div className="h-3 w-3/4 bg-surface-3 rounded mb-6" />

        <div className="h-10 w-full bg-surface-3 rounded" />
      </div>
    </article>
  );
}

export default function Card({
  id,
  tag,
  occupancy,
  title,
  price,
  description,
  highlights,
  roomImg,
  roomImgMobile,
  ctaTo,
  onCtaClick,
  acAvailable,
  nonAcAvailable,
}: RoomType) {
  const showClimateBadges = acAvailable || nonAcAvailable;

  return (
    <article className="bg-white rounded-2xl overflow-hidden border border-surface-3 transition-transform transform hover:-translate-y-2 hover:shadow-2xl duration-200 ease-in-out lg:flex lg:items-stretch">
      <div className="relative lg:w-1/2 lg:shrink-0">
        <picture>
          {/* Desktop */}
          <source media="(min-width: 768px)" srcSet={roomImg} />

          {/* Mobile */}
          <source
            media="(max-width: 767px)"
            srcSet={roomImgMobile || roomImg}
          />

          {/* Final fallback */}
          <img
            src={roomImg}
            alt={title ?? "Room image"}
            className="w-full h-56 lg:h-full object-cover block"
            loading="lazy"
          />
        </picture>

        {tag && (
          <div className="absolute left-4 top-4">
            {id === "private" ? (
              <span className="badge badge-default">
                <FiKey />
                {tag}
              </span>
            ) : (
              <span className="badge badge-success">
                <FiTag />
                {tag}
              </span>
            )}
          </div>
        )}
      </div>

      <div className="p-6 lg:p-7 flex flex-col lg:w-1/2">
        <div className="inline-flex items-center gap-2 kicker text-indigo-500 mb-3">
          {occupancy === "Single" ? (
            <FiUser className="w-4 h-4" aria-hidden />
          ) : (
            <FiUsers className="w-4 h-4" aria-hidden />
          )}

          <span>
            {occupancy === "Single" ? "Single Occupancy" : "Double Occupancy"}
          </span>
        </div>

        <h3 className="heading heading-lg text-slate-700">{title}</h3>

        {showClimateBadges && (
          <div className="mt-4 flex flex-wrap gap-2">
            {acAvailable && (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                <FiWind />
                AC
              </span>
            )}
            {nonAcAvailable && (
              <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                <FiWind />
                Non-AC
              </span>
            )}
          </div>
        )}

        <div className="space-y-1 my-4">
          <div className="text-2xl text-slate-700 font-semibold">
            {price} <span className="text-sm text-muted">/night</span>
          </div>
        </div>

        <p className="text-muted mb-5">{description}</p>

        {highlights?.length ? (
          <ul className="mb-6 space-y-3">
            {highlights.map((b) => (
              <li
                key={b}
                className="flex items-start gap-3 text-sm text-slate-600"
              >
                <span className="mt-0.5 text-amber-500">
                  <FiCheck className="w-4 h-4" aria-hidden />
                </span>
                <span>{b}</span>
              </li>
            ))}
          </ul>
        ) : null}

        <div className="mt-auto">
          <Button
            to={ctaTo}
            onClick={!ctaTo ? onCtaClick : undefined}
            variant="dark"
            size="fluid"
            iconRight={<FiChevronRight />}
          >
            View Details &amp; Tariff
          </Button>
        </div>
      </div>
    </article>
  );
}
