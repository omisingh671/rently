"use client";

import React from "react";
import {
  RiHome4Line,
  RiCustomerService2Line,
  RiStarSmileLine,
} from "react-icons/ri";

import IconBadge from "@/components/ui/IconBadge";
export default function AboutUs() {
  const sucasaHomeImg = "/assets/images/sucasa-homes/sucasa-homes.jpg";
  return (
    <section className="section bg-surface-1">
      <div className="container mx-auto grid grid-cols-1 lg:grid-cols-2 gap-14 items-center">
        <div>
          <span className="text-sm font-semibold tracking-wide text-indigo-600">
            OUR STORY
          </span>

          <h2 className="mt-2 heading heading-lg text-slate-700">
            Redefining Hospitality with a Personal Touch.
          </h2>

          <p className="mt-6 text-slate-500 text-lg max-w-xl">
            At Home Away from Home, we believe that travel shouldn’t mean
            compromising on comfort.
          </p>

          <p className="mt-4 text-muted max-w-xl leading-relaxed">
            Our journey began with a simple idea: to create a space that offers
            the luxury of a hotel with the warmth and freedom of a real home.
            Whether you're a corporate professional on a long assignment or a
            family exploring Hyderabad, our 3BHK apartments are designed to be
            your sanctuary.
          </p>

          {/* Stats */}
          <div className="mt-10 grid sm:grid-cols-3 gap-4">
            <StatItem
              icon={
                <IconBadge
                  layout="square"
                  icon={RiHome4Line}
                  color="text-indigo-500"
                  bg="bg-indigo-50 ring-indigo-200"
                />
              }
              value="8+"
              label="Premium Apartments"
            />

            <StatItem
              icon={
                <IconBadge
                  layout="square"
                  icon={RiCustomerService2Line}
                  color="text-amber-500"
                  bg="bg-amber-50 ring-amber-200"
                />
              }
              value="24/7"
              label="Guest Support"
            />

            <StatItem
              icon={
                <IconBadge
                  layout="square"
                  icon={RiStarSmileLine}
                  color="text-green-600"
                  bg="bg-green-50 ring-green-200"
                />
              }
              value="4.9"
              label="Guest Rating"
            />
          </div>
        </div>

        <div className="relative group">
          <div className="absolute -inset-4 rounded-3xl border border-amber-300/40" />

          <div className="relative rounded-3xl overflow-hidden shadow-xl">
            <img
              src={sucasaHomeImg}
              alt="Luxury apartment lobby"
              className="w-full h-full max-h-[650px] 2xl:max-h-[750px] object-cover transform rotate-3 scale-105 transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:rotate-0 group-hover:scale-100"
            />

            <div className="absolute bottom-6 left-6 right-6">
              <p className="text-white italic text-lg font-heading drop-shadow">
                “Your comfort is our priority.”
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function StatItem({
  icon,
  value,
  label,
}: {
  icon: React.ReactNode;
  value: string;
  label: string;
}) {
  return (
    <div className="flex items-center gap-4 py-2 px-4 rounded-lg border border-indigo-100">
      {/* Icon */}
      <div className="shrink-0">{icon}</div>

      {/* Text */}
      <div>
        <p className="text-2xl font-semibold text-indigo-900 leading-none">
          {value}
        </p>
        <p className="text-sm text-muted mt-1">{label}</p>
      </div>
    </div>
  );
}
