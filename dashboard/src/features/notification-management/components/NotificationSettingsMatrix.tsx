import type {
  NotificationEventKey,
  NotificationOverrideState,
  NotificationSettingsResponse,
} from "../types";
import ActiveToggle from "@/components/common/ActiveToggle";

export function NotificationSettingsMatrix({
  data,
  mode,
  propertyName,
  disabled,
  onGlobalChange,
  onOverrideChange,
}: {
  data: NotificationSettingsResponse;
  mode: "global" | "property";
  propertyName?: string;
  disabled: boolean;
  onGlobalChange: (eventKey: NotificationEventKey, enabled: boolean) => void;
  onOverrideChange: (eventKey: NotificationEventKey, state: NotificationOverrideState) => void;
}) {
  return (
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <div className="border-b border-slate-200 px-5 py-4">
        <h2 className="font-semibold text-slate-900">
          {mode === "global"
            ? "Global email defaults"
            : `Property email overrides${propertyName ? ` — ${propertyName}` : ""}`}
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          {mode === "global"
            ? "Safe defaults are disabled until explicitly enabled."
            : "Use Global inherits the current global email setting."}
        </p>
      </div>
      <div className="divide-y divide-slate-100">
        {data.events.map((event) => {
          const setting = event.settings.find((item) => item.channel === "EMAIL");
          if (!setting) return null;
          return (
            <div key={event.key} className="flex items-center justify-between gap-4 px-5 py-4">
              <div className="min-w-0">
                <p className="font-medium text-slate-900">{event.label}</p>
                <p className="mt-1 text-xs text-slate-500">
                  Effective: <span className={setting.effectiveEnabled ? "text-emerald-700" : "text-slate-600"}>
                    {setting.effectiveEnabled ? "Enabled" : "Disabled"}
                  </span>
                  {mode === "property" && ` · Global is ${setting.globalEnabled ? "Enabled" : "Disabled"}`}
                </p>
              </div>
              {mode === "global" ? (
                <div className="flex shrink-0 items-center gap-3">
                  <span className="min-w-14 text-right text-sm font-medium text-slate-600">
                    {setting.globalEnabled ? "Enabled" : "Disabled"}
                  </span>
                  <ActiveToggle
                    checked={setting.globalEnabled}
                    disabled={disabled}
                    onChange={(enabled) => onGlobalChange(event.key, enabled)}
                  />
                </div>
              ) : event.propertyScoped ? (
                <select
                  value={setting.overrideState ?? "USE_GLOBAL"}
                  disabled={disabled}
                  onChange={(e) => onOverrideChange(event.key, e.target.value as NotificationOverrideState)}
                  className="w-36 shrink-0 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:border-blue-500 focus:outline-none sm:w-40"
                >
                  <option value="USE_GLOBAL">Use Global</option>
                  <option value="ENABLED">Enabled</option>
                  <option value="DISABLED">Disabled</option>
                </select>
              ) : (
                <span className="w-36 shrink-0 rounded-lg bg-slate-100 px-3 py-2 text-center text-xs font-medium text-slate-500 sm:w-40">Global only</span>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
