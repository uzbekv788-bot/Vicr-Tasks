type P = { size?: number };
const base = (size: number) => ({
  width: size, height: size, viewBox: "0 0 24 24", fill: "none",
  stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const,
});

export const MicIcon = ({ size = 18 }: P) => (
  <svg {...base(size)}><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5 11a7 7 0 0 0 14 0M12 18v3" /></svg>
);
export const StopIcon = ({ size = 16 }: P) => (
  <svg {...base(size)}><rect x="6" y="6" width="12" height="12" rx="2" fill="currentColor" /></svg>
);
export const SparkIcon = ({ size = 16 }: P) => (
  <svg {...base(size)}><path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z" /><path d="M19 17l.7 1.6 1.6.7-1.6.7L19 22l-.7-1.6-1.6-.7 1.6-.7z" /></svg>
);
export const TrashIcon = ({ size = 15 }: P) => (
  <svg {...base(size)}><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" /></svg>
);
export const GripIcon = ({ size = 16 }: P) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
    {[6, 12, 18].map((y) => [9, 15].map((x) => <circle key={`${x}-${y}`} cx={x} cy={y} r="1.6" />))}
  </svg>
);
export const CloseIcon = ({ size = 12 }: P) => (
  <svg {...base(size)}><path d="M6 6l12 12M18 6L6 18" /></svg>
);
