type NexWashLogoProps = {
  compact?: boolean;
  inverse?: boolean;
  className?: string;
};

export function NexWashLogo({ compact = false, inverse = false, className = "" }: NexWashLogoProps) {
  return (
    <div className={`inline-flex items-center gap-2.5 ${className}`} aria-label="NexWash">
      <svg className="h-9 w-9 shrink-0" viewBox="0 0 36 36" fill="none" aria-hidden="true">
        <rect width="36" height="36" rx="11" fill={inverse ? "#FFFFFF" : "#075985"} />
        <path
          d="M10.2 23.8V12.2l8.6 8.7v-8.7"
          stroke={inverse ? "#075985" : "#FFFFFF"}
          strokeWidth="2.7"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M24.2 10.6c.9 2.4 2.2 3.8 4.5 4.7-2.3.8-3.6 2.2-4.5 4.6-.8-2.4-2.2-3.8-4.5-4.6 2.3-.9 3.7-2.3 4.5-4.7Z"
          fill={inverse ? "#22D3EE" : "#67E8F9"}
        />
        <path d="M22.4 25.3c2.2 0 4-.8 5.4-2.3" stroke={inverse ? "#0284C7" : "#BAE6FD"} strokeWidth="2" strokeLinecap="round" />
      </svg>
      {!compact ? (
        <span className={`text-[1.35rem] font-extrabold tracking-[-0.055em] ${inverse ? "text-white" : "text-wash-950"}`}>
          <span className={inverse ? "text-cyan-200" : "text-wash-700"}>Nex</span>Wash
        </span>
      ) : null}
    </div>
  );
}
