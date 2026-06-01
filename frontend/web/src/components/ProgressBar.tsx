type ProgressBarProps = {
  owned: number;
  total: number;
  percent: number;
};

export default function ProgressBar({ owned, total, percent }: ProgressBarProps) {
  return (
    <div className="progress-block">
      <div className="progress-bar-track">
        <div className="progress-bar-fill" style={{ width: `${percent}%` }} />
      </div>
      <p className="progress-stats">
        <strong>{owned}</strong> de <strong>{total}</strong> · <strong>{percent}%</strong>
      </p>
    </div>
  );
}
