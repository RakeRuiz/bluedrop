// Horario de atención de Blue Drop: Lunes a viernes 9:00–14:00 y 15:30–17:30 h,
// Sábado 9:00–14:00 h. Mérida usa el mismo horario estándar UTC-6 que
// America/Mexico_City (México abolió el horario de verano en 2022), así que se
// usa ese identificador IANA en vez de "America/Merida" (no es válido).
const TIME_ZONE = 'America/Mexico_City';

interface BusinessWindow {
  startMinutes: number;
  endMinutes: number;
}

const WINDOWS_BY_WEEKDAY: Record<number, BusinessWindow[]> = {
  0: [], // domingo
  1: [{ startMinutes: 9 * 60, endMinutes: 14 * 60 }, { startMinutes: 15 * 60 + 30, endMinutes: 17 * 60 + 30 }],
  2: [{ startMinutes: 9 * 60, endMinutes: 14 * 60 }, { startMinutes: 15 * 60 + 30, endMinutes: 17 * 60 + 30 }],
  3: [{ startMinutes: 9 * 60, endMinutes: 14 * 60 }, { startMinutes: 15 * 60 + 30, endMinutes: 17 * 60 + 30 }],
  4: [{ startMinutes: 9 * 60, endMinutes: 14 * 60 }, { startMinutes: 15 * 60 + 30, endMinutes: 17 * 60 + 30 }],
  5: [{ startMinutes: 9 * 60, endMinutes: 14 * 60 }, { startMinutes: 15 * 60 + 30, endMinutes: 17 * 60 + 30 }],
  6: [{ startMinutes: 9 * 60, endMinutes: 14 * 60 }], // sábado
};

function getMexicoCityParts(date: Date): { weekday: number; minutesOfDay: number } {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: TIME_ZONE,
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  });
  const parts = formatter.formatToParts(date);
  const weekdayShort = parts.find((p) => p.type === 'weekday')?.value ?? 'Sun';
  const hour = Number(parts.find((p) => p.type === 'hour')?.value ?? '0');
  const minute = Number(parts.find((p) => p.type === 'minute')?.value ?? '0');

  const weekdayMap: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

  return { weekday: weekdayMap[weekdayShort] ?? 0, minutesOfDay: hour * 60 + minute };
}

export function isWithinBusinessHours(date: Date = new Date()): boolean {
  const { weekday, minutesOfDay } = getMexicoCityParts(date);
  const windows = WINDOWS_BY_WEEKDAY[weekday] ?? [];
  return windows.some((w) => minutesOfDay >= w.startMinutes && minutesOfDay < w.endMinutes);
}

export const BUSINESS_HOURS_MESSAGE =
  'Lunes a viernes: de 9:00 a 14:00 y de 15:30 a 17:30 h.\nSábado: de 9:00 a 14:00 h.';
