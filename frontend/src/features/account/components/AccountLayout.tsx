import type { ReactNode } from "react";
import type { AccountTab } from "@/pages/guest/account/AccountPage";
import ProfileSidebar from "./AccountSidebar";

interface ProfileLayoutProps {
  activeTab: AccountTab;
  onChangeTab: (tab: AccountTab) => void;
  children: ReactNode;
}

export default function ProfileLayout({
  activeTab,
  onChangeTab,
  children,
}: ProfileLayoutProps) {
  return (
    <section className="section bg-white py-4">
      <div className="container">
        <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-4 lg:gap-8">
          <ProfileSidebar activeTab={activeTab} onChangeTab={onChangeTab} />

          <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-sm">
            {children}
          </div>
        </div>
      </div>
    </section>
  );
}
