type IconProps = { className?: string };

function Svg({ className, children }: IconProps & { children: React.ReactNode }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" strokeWidth={1.8} stroke="currentColor" className={className} aria-hidden="true">
      {children}
    </svg>
  );
}

export function UserIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0Z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 20.25a7.5 7.5 0 0 1 15 0" />
    </Svg>
  );
}

export function LogoutIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 9V5.25A2.25 2.25 0 0 1 10.5 3h6a2.25 2.25 0 0 1 2.25 2.25v13.5A2.25 2.25 0 0 1 16.5 21h-6a2.25 2.25 0 0 1-2.25-2.25V15" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 12h12m0 0-3.75-3.75M15 12l-3.75 3.75" />
    </Svg>
  );
}

export function HomeIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 10.5 12 4l8.25 6.5v9a.75.75 0 0 1-.75.75H15v-6H9v6H4.5a.75.75 0 0 1-.75-.75Z" />
    </Svg>
  );
}

export function CalendarIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <rect x="3.75" y="5.25" width="16.5" height="15" rx="2" />
      <path strokeLinecap="round" d="M3.75 9.75h16.5M8.25 3v4.5M15.75 3v4.5" />
    </Svg>
  );
}

export function ClockIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <circle cx="12" cy="12" r="8.25" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 7.5V12l3 2" />
    </Svg>
  );
}

export function SunUmbrellaIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 11.25a8.25 8.25 0 0 1 16.5 0Zm8.25 0v7.5a2.25 2.25 0 0 1-4.5 0" />
    </Svg>
  );
}

export function TeamIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <circle cx="9" cy="8.25" r="3" />
      <circle cx="17.25" cy="9" r="2.25" />
      <path strokeLinecap="round" d="M3.75 19.5c0-3.3 2.4-5.25 5.25-5.25s5.25 1.95 5.25 5.25M15.75 14.4c2.4-.3 4.5 1.2 4.5 4.35" />
    </Svg>
  );
}

export function IdCardIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <rect x="3" y="5.25" width="18" height="13.5" rx="2" />
      <circle cx="9" cy="11" r="2" />
      <path strokeLinecap="round" d="M6 16c.5-1.5 1.6-2.25 3-2.25s2.5.75 3 2.25M14.25 10h3.75M14.25 13.5h3" />
    </Svg>
  );
}

export function TemplateIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <rect x="3.75" y="3.75" width="7" height="7" rx="1.5" />
      <rect x="13.25" y="3.75" width="7" height="7" rx="1.5" />
      <rect x="3.75" y="13.25" width="7" height="7" rx="1.5" />
      <rect x="13.25" y="13.25" width="7" height="7" rx="1.5" />
    </Svg>
  );
}

export function BookIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.5C10 5 7 4.5 4 5v13.5c3-.5 6 0 8 1.5m0-13.5c2-1.5 5-2 8-1.5v13.5c-3-.5-6 0-8 1.5m0-13.5V20" />
    </Svg>
  );
}

export function HistoryIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 12a8.25 8.25 0 1 0 2.42-5.83M3.75 4.5v3.75H7.5M12 7.5V12l3 2" />
    </Svg>
  );
}

export function MoreIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path strokeLinecap="round" strokeWidth={3} d="M5.25 12h.01M12 12h.01M18.75 12h.01" />
    </Svg>
  );
}
