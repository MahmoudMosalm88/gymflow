"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Building2, Check, ChevronsUpDown, Settings } from "lucide-react";
import { api } from "@/lib/api-client";
import { getStoredBranchId, switchBranch, type BranchOption } from "@/lib/branch-session";
import { useAuth } from "@/lib/use-auth";
import { useLang } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";

const copy = {
  en: {
    branch: "Branch",
    loading: "Loading branches",
    manage: "Manage branches",
    switchTo: "Switch to branch"
  },
  ar: {
    branch: "الفرع",
    loading: "تحميل الفروع",
    manage: "إدارة الفروع",
    switchTo: "تبديل الفرع"
  }
} as const;

export default function BranchSwitcher() {
  const { profile } = useAuth();
  const { lang } = useLang();
  const c = copy[lang];
  const [branches, setBranches] = useState<BranchOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [switchingId, setSwitchingId] = useState<string | null>(null);
  const [currentBranchId, setCurrentBranchId] = useState<string | null>(null);

  useEffect(() => {
    if (profile?.role !== "owner") return;
    setCurrentBranchId(getStoredBranchId() || profile.branchId);
    let cancelled = false;
    setLoading(true);
    api
      .get<BranchOption[]>("/api/branches")
      .then((res) => {
        if (!cancelled && res.success && res.data) {
          setBranches(res.data);
          const current = res.data.find((branch) => branch.is_current);
          if (current) setCurrentBranchId(current.id);
        }
      })
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [profile?.branchId, profile?.role]);

  const currentBranch = useMemo(() => {
    return branches.find((branch) => branch.id === currentBranchId) || {
      id: profile?.branchId || "",
      name: profile?.branchName || c.branch
    };
  }, [branches, c.branch, currentBranchId, profile?.branchId, profile?.branchName]);

  if (profile?.role !== "owner") return null;

  async function handleSwitch(branch: BranchOption) {
    if (branch.id === currentBranchId || switchingId) return;
    setSwitchingId(branch.id);
    await switchBranch(branch);
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="max-w-[44vw] gap-2 px-2 sm:max-w-[240px] sm:px-3"
          aria-label={c.switchTo}
        >
          <Building2 className="h-4 w-4 shrink-0" />
          <span className="min-w-0 truncate">{currentBranch.name}</span>
          <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 opacity-70" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel>{loading ? c.loading : c.branch}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {branches.map((branch) => {
          const current = branch.id === currentBranchId;
          return (
            <DropdownMenuItem
              key={branch.id}
              disabled={current || Boolean(switchingId)}
              onSelect={(event) => {
                event.preventDefault();
                void handleSwitch(branch);
              }}
              className="justify-between"
            >
              <span className="truncate">{branch.name}</span>
              {current ? <Check className="h-4 w-4 text-destructive" /> : null}
            </DropdownMenuItem>
          );
        })}
        {branches.length === 0 && !loading ? (
          <DropdownMenuItem disabled>{profile.branchName || c.branch}</DropdownMenuItem>
        ) : null}
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/dashboard/settings?tab=branches" className="w-full">
            <Settings className="h-4 w-4" />
            {c.manage}
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
