import {
  useState,
  type ElementType,
  type KeyboardEvent,
} from "react";
import { ICON_REGISTRY } from "@/configs/iconRegistry";
import { useCurrentProperty } from "@/features/properties/hooks/useCurrentProperty";
import { useNotificationManagement } from "../hooks";
import type {
  NotificationChannel,
  NotificationEventKey,
  NotificationOverrideState,
} from "../types";
import { NotificationActivityPanels } from "./NotificationActivityPanels";
import { NotificationSettingsMatrix } from "./NotificationSettingsMatrix";

const { FiMail, FiMessageSquare, FiPhone } = ICON_REGISTRY;

const CHANNEL_ICONS = {
  EMAIL: FiMail,
  SMS: FiMessageSquare,
  WHATSAPP: FiPhone,
} satisfies Record<NotificationChannel, ElementType>;

export default function NotificationManagementPage() {
  const [mode, setMode] = useState<"global" | "property">("global");
  const [activeChannel, setActiveChannel] =
    useState<NotificationChannel>("EMAIL");
  const {
    selectedProperty,
    selectedPropertyId: propertyId,
  } = useCurrentProperty();
  const management = useNotificationManagement(
    mode === "property" && propertyId ? propertyId : undefined,
  );
  const saving =
    management.globalMutation.isPending || management.overrideMutation.isPending;
  const hasError =
    management.settings.isError ||
    management.audits.isError ||
    management.deliveries.isError;

  const updateGlobal = (eventKey: NotificationEventKey, enabled: boolean) => {
    management.globalMutation.mutate({
      eventKey,
      channel: "EMAIL",
      enabled,
    });
  };
  const updateOverride = (
    eventKey: NotificationEventKey,
    state: NotificationOverrideState,
  ) => {
    if (!propertyId) return;
    management.overrideMutation.mutate({
      propertyId,
      eventKey,
      channel: "EMAIL",
      state,
    });
  };
  const selectedChannel = management.settings.data?.channels.find(
    (channel) => channel.key === activeChannel,
  );
  const selectChannel = (channel: NotificationChannel, focus = false) => {
    setActiveChannel(channel);
    if (focus) {
      requestAnimationFrame(() => {
        document
          .getElementById(`notification-channel-tab-${channel.toLowerCase()}`)
          ?.focus();
      });
    }
  };
  const handleChannelKeyDown = (
    event: KeyboardEvent<HTMLButtonElement>,
    channelIndex: number,
  ) => {
    const channels = management.settings.data?.channels;
    if (!channels?.length) return;

    let nextIndex: number | undefined;
    if (event.key === "ArrowDown" || event.key === "ArrowRight") {
      nextIndex = (channelIndex + 1) % channels.length;
    } else if (event.key === "ArrowUp" || event.key === "ArrowLeft") {
      nextIndex = (channelIndex - 1 + channels.length) % channels.length;
    } else if (event.key === "Home") {
      nextIndex = 0;
    } else if (event.key === "End") {
      nextIndex = channels.length - 1;
    }

    if (nextIndex === undefined) return;
    event.preventDefault();
    const nextChannel = channels[nextIndex];
    if (nextChannel) selectChannel(nextChannel.key, true);
  };

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-slate-900">Notifications</h1>
        <p className="mt-1 text-sm text-slate-500">
          Configure guest-facing business notifications. Security emails are
          managed separately.
        </p>
      </header>

      {hasError && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          Some notification management data could not be loaded. Retry or
          refresh the page.
        </div>
      )}

      {management.settings.isLoading ? (
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
          Loading notification settings…
        </div>
      ) : management.settings.data ? (
        <div className="flex min-h-[calc(100vh-12rem)] flex-col gap-6 lg:flex-row">
          <aside className="w-full shrink-0 lg:w-64">
            <div
              role="tablist"
              aria-label="Notification channels"
              aria-orientation="vertical"
              className="flex flex-col gap-1 rounded-xl border border-slate-200/60 bg-white p-2 lg:sticky lg:top-0"
            >
              <div className="hidden px-3 py-2 text-xs font-semibold uppercase tracking-wider text-slate-400 lg:block">
                Channels
              </div>
              {management.settings.data.channels.map((channel, channelIndex) => {
                const Icon = CHANNEL_ICONS[channel.key];
                const isActive = activeChannel === channel.key;
                const channelId = channel.key.toLowerCase();

                return (
                  <button
                    key={channel.key}
                    id={`notification-channel-tab-${channelId}`}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    aria-controls={`notification-channel-panel-${channelId}`}
                    tabIndex={isActive ? 0 : -1}
                    onClick={() => selectChannel(channel.key)}
                    onKeyDown={(event) =>
                      handleChannelKeyDown(event, channelIndex)
                    }
                    className={`flex w-full items-center gap-3 rounded-lg px-4 py-2.5 text-left text-sm font-medium transition-all duration-200 ${
                      isActive
                        ? "bg-blue-600 text-white shadow-sm"
                        : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                    }`}
                  >
                    <Icon
                      className={`h-4 w-4 shrink-0 ${
                        isActive ? "text-white" : "text-slate-400"
                      }`}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block">{channel.label}</span>
                      <span
                        className={`block text-xs ${
                          isActive ? "text-blue-100" : "text-slate-400"
                        }`}
                      >
                        {channel.available ? "Available" : "Coming soon"}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </aside>

          <section
            id={`notification-channel-panel-${activeChannel.toLowerCase()}`}
            role="tabpanel"
            aria-labelledby={`notification-channel-tab-${activeChannel.toLowerCase()}`}
            className="min-w-0 flex-1 space-y-6"
          >
            {activeChannel === "EMAIL" ? (
              <>
                <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex flex-wrap items-center gap-4">
                    <div className="flex rounded-lg bg-slate-100 p-1">
                      {(["global", "property"] as const).map((value) => (
                        <button
                          key={value}
                          type="button"
                          onClick={() => setMode(value)}
                          className={`rounded-md px-4 py-2 text-sm font-semibold capitalize ${
                            mode === value
                              ? "bg-white text-slate-900 shadow-sm"
                              : "text-slate-600"
                          }`}
                        >
                          {value === "global"
                            ? "Global Defaults"
                            : "Property Overrides"}
                        </button>
                      ))}
                    </div>
                  </div>
                </section>

                {mode === "property" && !propertyId ? (
                  <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
                    Select a property to manage overrides.
                  </div>
                ) : (
                  <NotificationSettingsMatrix
                    data={management.settings.data}
                    mode={mode}
                    propertyName={selectedProperty?.name}
                    disabled={saving}
                    onGlobalChange={updateGlobal}
                    onOverrideChange={updateOverride}
                  />
                )}

                <NotificationActivityPanels
                  audits={management.audits.data ?? []}
                  deliveries={management.deliveries.data ?? []}
                  retryingId={
                    management.retryMutation.isPending
                      ? management.retryMutation.variables
                      : undefined
                  }
                  onRetry={(id) => management.retryMutation.mutate(id)}
                />
              </>
            ) : (
              <section className="rounded-2xl border border-slate-200/60 bg-white p-6 shadow-sm lg:p-8">
                <div className="flex flex-wrap items-center gap-3">
                  <h2 className="text-xl font-semibold text-slate-900">
                    {selectedChannel?.label}
                  </h2>
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-500">
                    Coming soon
                  </span>
                </div>
                <p className="mt-2 max-w-2xl text-sm text-slate-500">
                  This notification provider is not implemented yet. Its
                  settings will become available here once the provider is
                  connected.
                </p>
              </section>
            )}
          </section>
        </div>
      ) : null}
    </div>
  );
}
