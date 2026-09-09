export type GridUser = { id: string; name: string; isSelf: boolean; isAdmin: boolean };

export type GridShift = {
  id: string;
  userId: string;
  dateKey: string;
  label: string;
  color: string;
  startMinutes: number;
  endMinutes: number;
  breakMinutes: number | null;
  durationMinutes: number;
  note: string | null;
};

export type GridTemplate = {
  id: string;
  name: string;
  shortLabel: string;
  color: string;
  range: string;
  startMinutes: number;
  endMinutes: number;
  breakMinutes: number | null;
};

export type GridDay = {
  key: string;
  label: string; // "09.09."
  weekday: string; // "Di"
  isToday: boolean;
};
