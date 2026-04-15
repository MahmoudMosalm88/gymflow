'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api-client';
import { useLang, t } from '@/lib/i18n';
import LoadingSpinner from '@/components/dashboard/LoadingSpinner';
import TrainerCard from './TrainerCard';
import TrainerDetailSheet from './TrainerDetailSheet';
import type { TrainerProfileRow, TrainerRosterStatRow } from '@/lib/trainers';

export default function TrainersTab() {
  const { lang } = useLang();
  const labels = t[lang];
  const [trainers, setTrainers] = useState<TrainerProfileRow[]>([]);
  const [stats, setStats] = useState<TrainerRosterStatRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTrainer, setSelectedTrainer] = useState<TrainerProfileRow | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      api.get<TrainerProfileRow[]>('/api/trainers'),
      api.get<TrainerRosterStatRow[]>('/api/trainers/stats'),
    ]).then(([trainersRes, statsRes]) => {
      if (cancelled) return;
      setTrainers(trainersRes.data ?? []);
      setStats(statsRes.data ?? []);
    }).catch((error) => {
      console.error('Failed to load trainers tab data', error);
    }).finally(() => {
      if (!cancelled) setLoading(false);
    });
    return () => { cancelled = true; };
  }, []);

  if (loading) {
    return <div className="flex justify-center py-16"><LoadingSpinner /></div>;
  }

  // Active trainers first, then inactive
  const sorted = [...trainers].sort((a, b) => {
    if (a.is_active !== b.is_active) return a.is_active ? -1 : 1;
    return a.name.localeCompare(b.name);
  });

  const statsMap = new Map(stats.map(s => [s.trainer_id, s]));

  if (sorted.length === 0) {
    return (
      <div className="border-2 border-border bg-card py-16 text-center">
        <p className="text-sm text-muted-foreground">{labels.no_trainers_yet}</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {sorted.map(trainer => (
        <TrainerCard
          key={trainer.id}
          trainer={trainer}
          stats={statsMap.get(trainer.id)}
          lang={lang}
          onClick={() => setSelectedTrainer(trainer)}
        />
      ))}
      <TrainerDetailSheet
        trainer={selectedTrainer}
        open={!!selectedTrainer}
        onClose={() => setSelectedTrainer(null)}
      />
    </div>
  );
}
