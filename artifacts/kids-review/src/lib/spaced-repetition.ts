import { addDays, format } from "date-fns";

export const SPacedRepetitionIntervals = [1, 3, 7, 7, 7, 14, 30, 45, 60];

export function generateReviewDates(firstDateStr: string): string[] {
  const dates: string[] = [];
  let currentDate = new Date(firstDateStr);
  
  for (const interval of SPacedRepetitionIntervals) {
    currentDate = addDays(currentDate, interval);
    dates.push(format(currentDate, "yyyy-MM-dd"));
  }
  
  return dates;
}
