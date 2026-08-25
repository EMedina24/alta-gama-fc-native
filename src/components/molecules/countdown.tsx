/**
 * "1d 04h 22m" until a kickoff. Ticks once a minute.
 *
 * ⚠ A minute, not a second. A seconds counter is a liveness claim, it wakes the
 * JS thread 60× more often for a number nobody reads that precisely, and the
 * design's `KICKOFF IN` row shows minutes as its finest unit.
 *
 * ⚠ Never rendered for a `kickoffTbd` fixture — that timestamp is midnight UTC
 * standing in for "a date, time unknown", so a countdown to it is counting down
 * to a fiction. Callers gate on the flag.
 */
import { useEffect, useState } from 'react';

import { Text } from '@/components/atoms';

const MINUTE = 60_000;

function parts(msRemaining: number): string {
  if (msRemaining <= 0) return '00m';
  const totalMinutes = Math.floor(msRemaining / MINUTE);
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;

  if (days > 0) return `${days}d ${String(hours).padStart(2, '0')}h`;
  if (hours > 0) return `${hours}h ${String(minutes).padStart(2, '0')}m`;
  return `${String(minutes).padStart(2, '0')}m`;
}

export function Countdown({ kickoffUtc }: { kickoffUtc: string }) {
  const target = Date.parse(kickoffUtc);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), MINUTE);
    return () => clearInterval(id);
  }, []);

  return (
    <Text variant="kickoff" tabular>
      {parts(target - now)}
    </Text>
  );
}
