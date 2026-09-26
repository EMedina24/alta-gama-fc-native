/**
 * A concurrency gate: at most `size` of the wrapped tasks in flight at once,
 * the rest queued in call order.
 *
 * Built for the Starting XI picker (ADR 0214), which asks for up to one stats
 * payload per squad player — 25 on a LaLiga club — through React Query. The
 * cache dedupes and retries; this only keeps the burst to the handoff's four
 * at a time so a picker opening does not queue two dozen requests ahead of
 * everything else the app is fetching.
 *
 * Pure: no React. A rejected task frees its slot like a resolved one.
 */
export function createLimiter(size: number) {
  let active = 0;
  const queue: (() => void)[] = [];

  const next = () => {
    if (active >= size) return;
    const start = queue.shift();
    if (start) start();
  };

  return function limit<T>(task: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      queue.push(() => {
        active += 1;
        task()
          .then(resolve, reject)
          .finally(() => {
            active -= 1;
            next();
          });
      });
      next();
    });
  };
}
