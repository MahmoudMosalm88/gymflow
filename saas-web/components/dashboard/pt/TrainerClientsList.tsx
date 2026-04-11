'use client';

import { useRouter } from 'next/navigation';

type Client = {
  id: string;
  name: string;
  phone?: string | null;
  active_packages: number;
  sessions_remaining: number;
};

type Props = {
  clients: Client[];
  lang: string;
};

export default function TrainerClientsList({ clients, lang }: Props) {
  const router = useRouter();

  if (clients.length === 0) {
    return (
      <p className="text-xs text-muted-foreground">
        {lang === 'ar' ? 'لا يوجد عملاء مخصصين' : 'No assigned clients'}
      </p>
    );
  }

  return (
    <div className="space-y-1">
      {clients.map(client => (
        <button
          key={client.id}
          onClick={() => router.push(`/dashboard/members/${client.id}`)}
          className="flex items-center justify-between w-full px-3 py-2 border border-border hover:bg-secondary/50 transition-colors text-start"
        >
          <div className="min-w-0">
            <p className="text-sm font-medium text-foreground truncate">{client.name}</p>
            {client.phone && <p className="text-[11px] text-muted-foreground">{client.phone}</p>}
          </div>
          <div className="text-end shrink-0 ms-3">
            <p className={`text-sm font-stat ${client.sessions_remaining <= 2 ? 'text-destructive' : 'text-foreground'}`}>
              {client.sessions_remaining}
            </p>
            <p className="text-[10px] text-muted-foreground">
              {lang === 'ar' ? 'جلسات متبقية' : 'sessions left'}
            </p>
          </div>
        </button>
      ))}
    </div>
  );
}
