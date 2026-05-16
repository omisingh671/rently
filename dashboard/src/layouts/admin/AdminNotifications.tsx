import { useState, useRef, useEffect } from "react";
import { FiBell } from "react-icons/fi";

const notifications = [
  {
    id: 1,
    title: "New Booking",
    description: "Rajesh Kumar booked Unit A",
    time: "2 mins ago",
    unread: true,
  },
  {
    id: 2,
    title: "Payment Received",
    description: "₹68,000 received for #BK001",
    time: "1 hour ago",
  },
  {
    id: 3,
    title: "Check-out Reminder",
    description: "Priya Singh checking out today",
    time: "3 hours ago",
  },
  {
    id: 4,
    title: "System Update",
    description: "New property management features live",
    time: "1 day ago",
  },
];

export default function AdminNotifications() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const hasUnread = notifications.some((n) => n.unread);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative rounded-md p-2 hover:bg-[#3f4270] md:hover:bg-slate-100 cursor-pointer"
      >
        <FiBell size={20} />
        {hasUnread && (
          <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-red-500 ring-2 ring-[#33365b] md:ring-white" />
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-80 rounded-xl bg-white shadow-lg ring-1 ring-black/5">
          <div className="flex items-center justify-between px-4 py-3 rounded-t-xl bg-gray-100 border-b border-b-gray-200">
            <p className="text-sm font-semibold text-slate-900">
              Notifications
            </p>
            <button className="text-xs text-slate-400 hover:text-indigo-600 cursor-pointer">
              Mark all read
            </button>
          </div>

          <ul className="p-2 space-y-2 divide-y divide-gray-200 max-h-96 overflow-y-auto cursor-pointer">
            {notifications.map((n) => (
              <li
                key={n.id}
                className="px-3 py-2 hover:bg-slate-50 border border-gray-100 rounded-lg"
              >
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-slate-900">
                    {n.title}
                  </p>
                  <span className="text-xs text-slate-400">{n.time}</span>
                </div>
                <p className="mt-0.5 text-sm text-slate-600">{n.description}</p>
              </li>
            ))}
          </ul>

          <div className="px-4 py-3 text-center border-t border-t-gray-100">
            <button className="text-sm font-medium text-blue-600 hover:underline cursor-pointer">
              View all notifications
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
