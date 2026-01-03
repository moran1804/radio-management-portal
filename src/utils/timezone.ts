import { format, addMinutes } from "date-fns";
import { formatInTimeZone, toZonedTime, fromZonedTime } from "date-fns-tz";

const UK_TIMEZONE = 'Europe/London';

/**
 * Convert UK time to UTC for database storage
 */
export const ukTimeToUTC = (ukDate: Date): Date => {
  return fromZonedTime(ukDate, UK_TIMEZONE);
};

/**
 * Convert UTC time to UK time for display
 */
export const utcToUKTime = (utcDate: Date): Date => {
  return toZonedTime(utcDate, UK_TIMEZONE);
};

/**
 * Format UTC date as UK time string
 */
export const formatUKTime = (utcDate: Date | string, formatString: string = 'HH:mm'): string => {
  const date = typeof utcDate === 'string' ? new Date(utcDate) : utcDate;
  return formatInTimeZone(date, UK_TIMEZONE, formatString);
};

/**
 * Format UTC date as UK date string
 */
export const formatUKDate = (utcDate: Date | string, formatString: string = 'PPP'): string => {
  const date = typeof utcDate === 'string' ? new Date(utcDate) : utcDate;
  return formatInTimeZone(date, UK_TIMEZONE, formatString);
};

/**
 * Format UTC datetime as UK datetime string
 */
export const formatUKDateTime = (utcDate: Date | string, formatString: string = 'PPP HH:mm'): string => {
  const date = typeof utcDate === 'string' ? new Date(utcDate) : utcDate;
  return formatInTimeZone(date, UK_TIMEZONE, formatString);
};

/**
 * Create a UK date from date and time inputs
 */
export const createUKDateTime = (date: Date, timeString: string): Date => {
  const [hours, minutes] = timeString.split(':').map(Number);
  const ukDateTime = new Date(date);
  ukDateTime.setHours(hours, minutes, 0, 0);
  return ukDateTime;
};

/**
 * Convert UK datetime to UTC and add duration in minutes
 */
export const createUKDateTimeRange = (date: Date, timeString: string, durationMinutes: number) => {
  const ukDateTime = createUKDateTime(date, timeString);
  const startUTC = ukTimeToUTC(ukDateTime);
  const endUTC = addMinutes(startUTC, durationMinutes);
  
  return {
    startUTC,
    endUTC
  };
};

/**
 * Get current UK time
 */
export const getCurrentUKTime = (): Date => {
  return utcToUKTime(new Date());
};

/**
 * Format time range in UK timezone
 */
export const formatUKTimeRange = (startUTC: Date | string, endUTC: Date | string): string => {
  const start = formatUKTime(startUTC, 'HH:mm');
  const end = formatUKTime(endUTC, 'HH:mm');
  return `${start} - ${end}`;
};