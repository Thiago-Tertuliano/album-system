import { useRef, useState, type ReactNode } from 'react';

type PullToRefreshProps = {
  onRefresh: () => Promise<void>;
  children: ReactNode;
};

const THRESHOLD = 60;

export default function PullToRefresh({ onRefresh, children }: PullToRefreshProps) {
  const [refreshing, setRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const startY = useRef(0);
  const pulling = useRef(false);

  function handleTouchStart(e: React.TouchEvent) {
    if (refreshing) return;
    const scrollTop = (e.currentTarget as HTMLElement).scrollTop ?? 0;
    if (scrollTop > 0) return;
    startY.current = e.touches[0].clientY;
    pulling.current = false;
    setPullDistance(0);
  }

  function handleTouchMove(e: React.TouchEvent) {
    if (refreshing) return;
    const scrollTop = (e.currentTarget as HTMLElement).scrollTop ?? 0;
    if (scrollTop > 0) return;
    const dy = e.touches[0].clientY - startY.current;
    if (dy > 0) {
      pulling.current = true;
      setPullDistance(Math.min(dy, 80));
    }
  }

  async function handleTouchEnd() {
    if (refreshing || !pulling.current) return;
    if (pullDistance >= THRESHOLD) {
      setRefreshing(true);
      setPullDistance(0);
      try {
        await onRefresh();
      } finally {
        setRefreshing(false);
      }
    } else {
      setPullDistance(0);
    }
    pulling.current = false;
  }

  return (
    <div
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{ position: 'relative' }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: refreshing ? 40 : pullDistance,
          overflow: 'hidden',
          transition: refreshing ? 'height 0.2s ease' : pullDistance > 0 ? 'none' : 'height 0.2s ease',
          color: 'var(--muted)',
          fontSize: '0.8rem',
        }}
      >
        {refreshing ? (
          <span className="ptr-spinner" />
        ) : pullDistance >= THRESHOLD ? (
          'Solte para atualizar'
        ) : pullDistance > 10 ? (
          'Puxe para atualizar'
        ) : null}
      </div>
      {children}
    </div>
  );
}
