import { RiMailLine, RiMapPinLine, RiPhoneLine } from "react-icons/ri";
import { FiNavigation } from "react-icons/fi";
import { usePublicTenantConfig } from "@/features/public-config/hooks";

const phoneHref = (value: string) => `tel:${value.replace(/\s/g, "")}`;

export default function PropertyContactSection() {
  const { data: tenantConfig, isLoading } = usePublicTenantConfig();
  const contacts = tenantConfig?.propertyContacts ?? [];

  if (isLoading || contacts.length === 0) {
    return null;
  }

  return (
    <section className="section bg-slate-50">
      <div className="container">
        <div className="mx-auto max-w-7xl">
          <div className="mb-10 text-center">
            <span className="kicker text-indigo-700">Our Locations</span>
            <h2 className="heading heading-md text-slate-900">
              Find a Property Near You
            </h2>
          </div>

          <div className="flex flex-wrap justify-center gap-6 lg:gap-8">
            {contacts.map((property) => (
              <article
                key={property.id}
                className="w-full sm:w-[calc(50%-1.5rem)] lg:w-[calc(33.333%-2rem)] max-w-md flex flex-col items-center text-center rounded-xl border border-slate-200 bg-white p-8 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md"
              >
                <h3 className="text-xl font-bold text-slate-900">
                  {property.name}
                </h3>
                <p className="mt-1.5 text-sm font-medium text-slate-500">
                  {property.city}, {property.state}
                </p>

                <div className="mt-6 space-y-3 text-sm text-slate-700 w-full">
                  {property.supportPhone && (
                    <a
                      href={phoneHref(property.supportPhone)}
                      className="flex items-center justify-center gap-2 text-slate-700 hover:text-indigo-700 transition-colors"
                    >
                      <RiPhoneLine className="h-4 w-4 text-indigo-500" />
                      {property.supportPhone}
                    </a>
                  )}

                  {property.supportEmail && (
                    <a
                      href={`mailto:${property.supportEmail}`}
                      className="flex items-center justify-center gap-2 text-slate-700 hover:text-indigo-700 transition-colors"
                    >
                      <RiMailLine className="h-4 w-4 text-indigo-500" />
                      {property.supportEmail}
                    </a>
                  )}

                  <div className="flex items-start justify-center gap-2 text-slate-600">
                    <RiMapPinLine className="mt-0.5 h-4 w-4 shrink-0 text-indigo-500" />
                    <span>{property.address}</span>
                  </div>
                </div>

                <div className="mt-auto w-full pt-8">
                  <hr className="mb-6 w-full border-slate-100" />
                  <a
                    href={
                      property.latitude && property.longitude
                        ? `https://www.google.com/maps/dir/?api=1&destination=${property.latitude},${property.longitude}`
                        : `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
                            property.address || `${property.city}, ${property.state}`
                          )}`
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex w-full items-center justify-center gap-2 rounded-lg border-2 border-indigo-600 px-4 py-2.5 text-sm font-semibold text-indigo-600 hover:bg-indigo-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-colors"
                  >
                    <FiNavigation className="h-4 w-4" />
                    Get Directions
                  </a>
                </div>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
