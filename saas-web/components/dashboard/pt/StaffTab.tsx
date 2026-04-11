'use client';

import TeamTab from '@/components/dashboard/settings/TeamTab';

// Thin wrapper — reuses the existing TeamTab component from Settings.
// When the full Staff management features are built, this wrapper
// will be replaced with a richer component.
export default function StaffTab() {
  return <TeamTab />;
}
