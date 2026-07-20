interface ProgressBarProps {
  percent: number
  color?: string
  label?: string
}

export function ProgressBar({ percent, color, label }: ProgressBarProps) {
  const clamped = Math.max(0, Math.min(100, percent))
  return (
    <div className="progress-bar" aria-label={label} role="progressbar" aria-valuenow={clamped} aria-valuemin={0} aria-valuemax={100}>
      <div className="progress-bar-track">
        <div
          className="progress-bar-fill"
          style={{ width: `${clamped}%`, backgroundColor: color }}
        />
      </div>
      <span className="progress-bar-label">{clamped}%</span>
    </div>
  )
}
