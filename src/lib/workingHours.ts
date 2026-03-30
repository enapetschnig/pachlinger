export interface WorkTimePreset {
  startTime: string;
  endTime: string;
  pauseStart: string;
  pauseEnd: string;
  pauseMinutes: number;
  totalHours: number;
}

export interface CalculatedWorkTimeResult {
  startTime: string;
  endTime: string;
  pauseStart: string;
  pauseEnd: string;
  pauseMinutes: number;
  totalHours: number;
}

const FIXED_LUNCH_START = "12:00";
const FIXED_LUNCH_END = "12:30";
const FIXED_LUNCH_START_MINUTES = 12 * 60;
const FIXED_LUNCH_END_MINUTES = 12 * 60 + 30;

export function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

export function minutesToTime(totalMinutes: number): string {
  const normalizedMinutes = Math.max(0, Math.round(totalMinutes));
  const hours = Math.floor(normalizedMinutes / 60);
  const minutes = normalizedMinutes % 60;

  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

const isMondayToThursday = (date: Date): boolean => {
  const dayOfWeek = date.getDay();
  return dayOfWeek >= 1 && dayOfWeek <= 4;
};

export function normalizeWorkStartTime(date: Date, startTime: string): string {
  if (!isMondayToThursday(date)) return startTime;

  const startMinutes = timeToMinutes(startTime);
  if (startMinutes >= FIXED_LUNCH_START_MINUTES && startMinutes < FIXED_LUNCH_END_MINUTES) {
    return FIXED_LUNCH_END;
  }

  return startTime;
}

export function calculateSuggestedStartTime(date: Date, lastEndTime: string | null, gapMinutes = 30): string {
  if (!lastEndTime) {
    return normalizeWorkStartTime(date, "07:00");
  }

  return normalizeWorkStartTime(date, minutesToTime(timeToMinutes(lastEndTime) + gapMinutes));
}

export function calculateWorkTimeRange(
  date: Date,
  totalHours: number,
  requestedStartTime = "07:00"
): CalculatedWorkTimeResult {
  const normalizedStartTime = normalizeWorkStartTime(date, requestedStartTime);
  const safeHours = Number.isFinite(totalHours) ? Math.max(0, totalHours) : 0;

  if (safeHours === 0) {
    return {
      startTime: normalizedStartTime,
      endTime: "",
      pauseStart: "",
      pauseEnd: "",
      pauseMinutes: 0,
      totalHours: 0,
    };
  }

  const startMinutes = timeToMinutes(normalizedStartTime);
  const workingMinutes = Math.round(safeHours * 60);
  const rawEndMinutes = startMinutes + workingMinutes;
  const needsLunchBreak = isMondayToThursday(date)
    && startMinutes < FIXED_LUNCH_START_MINUTES
    && rawEndMinutes > FIXED_LUNCH_START_MINUTES;

  const pauseMinutes = needsLunchBreak ? FIXED_LUNCH_END_MINUTES - FIXED_LUNCH_START_MINUTES : 0;
  const endMinutes = rawEndMinutes + pauseMinutes;

  return {
    startTime: normalizedStartTime,
    endTime: minutesToTime(endMinutes),
    pauseStart: needsLunchBreak ? FIXED_LUNCH_START : "",
    pauseEnd: needsLunchBreak ? FIXED_LUNCH_END : "",
    pauseMinutes,
    totalHours: safeHours,
  };
}

/**
 * Gibt die Normalarbeitszeit für einen Tag zurück
 * Mo-Do: 8.5h, Fr: 4.5h (ohne Überstunde), Sa-So: 0h
 */
export function getNormalWorkingHours(date: Date): number {
  const dayOfWeek = date.getDay();

  if (dayOfWeek === 0 || dayOfWeek === 6) return 0;
  if (dayOfWeek >= 1 && dayOfWeek <= 4) return 8.5;
  if (dayOfWeek === 5) return 4.5;

  return 0;
}

/**
 * Gibt die Freitags-Überstunde zurück (0.5h für ZA)
 */
export function getFridayOvertime(date: Date): number {
  return date.getDay() === 5 ? 0.5 : 0;
}

/**
 * Gibt die tatsächlichen Arbeitsstunden für Freitag zurück (inkl. Überstunde)
 * Mo-Do: 8.5h, Fr: 5.0h (inkl. 0.5h Überstunde), Sa-So: 0h
 */
export function getTotalWorkingHours(date: Date): number {
  const dayOfWeek = date.getDay();

  if (dayOfWeek === 0 || dayOfWeek === 6) return 0;
  if (dayOfWeek >= 1 && dayOfWeek <= 4) return 8.5;
  if (dayOfWeek === 5) return 5.0;

  return 0;
}

/**
 * Gibt die Sollstunden für eine Woche zurück: 39 Stunden
 */
export function getWeeklyTargetHours(): number {
  return 39;
}

/**
 * Gibt Standard-Arbeitszeiten für einen Tag zurück
 */
export function getDefaultWorkTimes(date: Date): WorkTimePreset | null {
  const totalHours = getTotalWorkingHours(date);

  if (totalHours <= 0) return null;

  const calculated = calculateWorkTimeRange(date, totalHours, "07:00");

  return {
    startTime: calculated.startTime,
    endTime: calculated.endTime,
    pauseStart: calculated.pauseStart,
    pauseEnd: calculated.pauseEnd,
    pauseMinutes: calculated.pauseMinutes,
    totalHours: calculated.totalHours,
  };
}

/**
 * Prüft ob ein Tag ein arbeitsfreier Tag ist (nur Wochenende)
 */
export function isNonWorkingDay(date: Date): boolean {
  const dayOfWeek = date.getDay();
  return dayOfWeek === 0 || dayOfWeek === 6;
}
