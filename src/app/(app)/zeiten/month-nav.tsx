import { PeriodPicker } from "@/components/period-picker";
import { dayKey } from "@/lib/time-zone";

export function MonthNav({
  basePath,
  month,
}: {
  basePath: "/zeiten" | `/mitarbeiter/${string}/zeiten`;
  month: string; // "yyyy-MM"
}) {
  return (
    <PeriodPicker
      mode="month"
      value={month}
      current={dayKey(new Date()).slice(0, 7)}
      basePath={basePath}
      param="m"
    />
  );
}
