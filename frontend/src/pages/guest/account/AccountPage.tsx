import { useState } from "react";

import AccountLayout from "@/features/account/components/AccountLayout";
import MyBookings from "@/features/account/components/AccountBookings";
import Payments from "@/features/account/components/AccountPayments";
import Settings from "@/features/account/components/AccountSettings";

import ProfilePage from "@/pages/profile/ProfilePage";
import ChangePasswordPage from "@/pages/profile/ChangePasswordPage";

export type AccountTab =
  | "profile"
  | "bookings"
  | "payments"
  | "settings"
  | "changePassword";

export default function AccountProfilePage() {
  const [activeTab, setActiveTab] = useState<AccountTab>("profile");

  /** Inline wrappers (local-only) */
  const MyProfile = (
    <>
      <h2 className="text-2xl font-semibold text-slate-900 mb-1">
        Personal Information
      </h2>

      <p className="text-slate-500 mb-6">
        Update your personal details and contact information
      </p>

      <ProfilePage />
    </>
  );

  const ChangePassword = (
    <>
      <h2 className="text-2xl font-semibold text-slate-900 mb-1">
        Change Password
      </h2>

      <p className="text-slate-500 mb-6">Update your account password</p>

      <ChangePasswordPage />
    </>
  );

  return (
    <AccountLayout activeTab={activeTab} onChangeTab={setActiveTab}>
      {activeTab === "profile" && MyProfile}
      {activeTab === "bookings" && <MyBookings />}
      {activeTab === "payments" && <Payments />}
      {activeTab === "settings" && <Settings />}
      {activeTab === "changePassword" && ChangePassword}
    </AccountLayout>
  );
}
