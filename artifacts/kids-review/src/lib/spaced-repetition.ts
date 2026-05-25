import { addDays, format } from "date-fns";

export const SPACED_REPETITION_INTERVALS = [1, 2, 3, 5, 7, 14, 14, 30];

export function generateReviewDates(firstDateStr: string): string[] {
  const dates: string[] = [];
  let currentDate = new Date(firstDateStr + "T00:00:00");

  for (const interval of SPACED_REPETITION_INTERVALS) {
    currentDate = addDays(currentDate, interval);
    dates.push(format(currentDate, "yyyy-MM-dd"));
  }

  return dates;
}

export function adjustNextDate(
  reviewDates: string[],
  completedIndex: number,
  difficulty: "easy" | "normal" | "hard"
): string[] {
  if (difficulty !== "hard") return reviewDates;
  const nextIndex = completedIndex + 1;
  if (nextIndex >= reviewDates.length) return reviewDates;

  const completedDate = new Date(reviewDates[completedIndex] + "T00:00:00");
  const nextDate = new Date(reviewDates[nextIndex] + "T00:00:00");
  const currentInterval = Math.round(
    (nextDate.getTime() - completedDate.getTime()) / (1000 * 60 * 60 * 24)
  );

  const newInterval = Math.max(1, Math.floor(currentInterval / 2));
  const diffMs =
    addDays(completedDate, newInterval).getTime() - nextDate.getTime();

  const newDates = [...reviewDates];
  for (let i = nextIndex; i < newDates.length; i++) {
    const d = new Date(newDates[i] + "T00:00:00");
    newDates[i] = format(new Date(d.getTime() + diffMs), "yyyy-MM-dd");
  }

  return newDates;
}
