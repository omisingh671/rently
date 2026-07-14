import { ICON_REGISTRY } from "@/configs/iconRegistry";

const { FiInfo } = ICON_REGISTRY;

export function SystemGuideOverviewSection() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">
          Rently Architecture Overview
        </h1>
        <p className="mt-2 text-slate-500">
          A high-level understanding of the technology stack, application
          architecture boundaries, and fundamental guidelines that govern the
          Rently system.
        </p>
      </div>

      <hr className="border-slate-100" />

      {/* Technology Stack Grid */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="p-4 rounded-xl border border-slate-100 bg-slate-50/50">
          <h3 className="font-semibold text-slate-900">Frontend Technology</h3>
          <ul className="mt-2 space-y-1.5 text-sm text-slate-600">
            <li>
              • <span className="font-medium">Vite + React</span> for quick and
              performant single-page builds
            </li>
            <li>
              • <span className="font-medium">TypeScript</span> strict mode for
              end-to-end safety
            </li>
            <li>
              • <span className="font-medium">React Query</span> for declarative
              server-state management
            </li>
            <li>
              • <span className="font-medium">Zustand</span> for minimal, fast
              client-side state
            </li>
            <li>
              • <span className="font-medium">Tailwind CSS</span> for responsive
              utility-first styling
            </li>
          </ul>
        </div>

        <div className="p-4 rounded-xl border border-slate-100 bg-slate-50/50">
          <h3 className="font-semibold text-slate-900">Backend Technology</h3>
          <ul className="mt-2 space-y-1.5 text-sm text-slate-600">
            <li>
              • <span className="font-medium">Node.js + Express</span> running
              our server framework
            </li>
            <li>
              • <span className="font-medium">Prisma ORM</span> to interact
              securely with a relational database
            </li>
            <li>
              • <span className="font-medium">Layered Architecture</span>{" "}
              separating routing, logic, and queries
            </li>
            <li>
              • <span className="font-medium">Zod validation</span> to validate
              request boundaries at runtime
            </li>
            <li>
              • <span className="font-medium">DTO-based responses</span> for
              clean and predictable contracts
            </li>
          </ul>
        </div>
      </div>

      {/* Backend Layers Flow */}
      <div className="space-y-3">
        <h3 className="text-lg font-semibold text-slate-950">
          Layered Architecture Flow
        </h3>
        <p className="text-sm text-slate-600">
          The backend follows a strict unidirectional data flow. This keeps
          operations decoupled and easy to test:
        </p>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 p-3 bg-slate-50 border border-slate-100 rounded-xl">
          <div className="flex-1 text-center p-3.5 bg-white border border-slate-200/80 rounded-lg shadow-sm">
            <span className="block text-xs font-semibold text-blue-600 uppercase">
              1. Route
            </span>
            <span className="text-sm text-slate-700">
              Validates shape using Zod schemas
            </span>
          </div>
          <div className="text-center text-slate-400 font-bold hidden sm:block">
            ➔
          </div>
          <div className="flex-1 text-center p-3.5 bg-white border border-slate-200/80 rounded-lg shadow-sm">
            <span className="block text-xs font-semibold text-emerald-600 uppercase">
              2. Controller
            </span>
            <span className="text-sm text-slate-700">
              Handles HTTP request/response DTOs
            </span>
          </div>
          <div className="text-center text-slate-400 font-bold hidden sm:block">
            ➔
          </div>
          <div className="flex-1 text-center p-3.5 bg-white border border-slate-200/80 rounded-lg shadow-sm">
            <span className="block text-xs font-semibold text-purple-600 uppercase">
              3. Service
            </span>
            <span className="text-sm text-slate-700">
              Orchestrates business rules & state
            </span>
          </div>
          <div className="text-center text-slate-400 font-bold hidden sm:block">
            ➔
          </div>
          <div className="flex-1 text-center p-3.5 bg-white border border-slate-200/80 rounded-lg shadow-sm">
            <span className="block text-xs font-semibold text-rose-600 uppercase">
              4. Repository
            </span>
            <span className="text-sm text-slate-700">
              Queries database via Prisma client
            </span>
          </div>
        </div>
      </div>

      {/* Core Engineering Guideline Box */}
      <div className="p-4 rounded-xl border border-indigo-100 bg-indigo-50/40 text-indigo-950">
        <div className="flex items-start gap-3">
          <FiInfo className="w-5 h-5 text-indigo-600 mt-0.5 shrink-0" />
          <div>
            <h4 className="font-semibold">
              Core Principle: Strict Domain Separation
            </h4>
            <p className="mt-1 text-sm text-indigo-900/85">
              Rently is designed as a modular monolith. Avoid tight couplings
              between modules (e.g. Booking querying Unit database schemas
              directly). Business modules should remain isolated and interact
              through clean public APIs, event logic, or shared interfaces,
              strictly maintaining tenant scoping.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
