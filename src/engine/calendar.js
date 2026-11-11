// Date helpers for the concert calendar. Dates are plain 'YYYY-MM-DD' strings, which sort and
// compare correctly as text. "Today" is always today in Jakarta (UTC+7, no daylight saving).

const sorted = (show) => [...show.dates].sort();

export function jakartaToday(now = new Date()) {
  return new Date(now.getTime() + 7 * 3600 * 1000).toISOString().slice(0, 10);
}

/** The first date of a show that has not passed yet, or null when all have. */
export function nextDate(show, today) {
  return sorted(show).find((d) => d >= today) || null;
}

/** Shows whose last date is today or later, soonest first. */
export function upcoming(shows, today) {
  return shows
    .filter((s) => nextDate(s, today))
    .sort((a, b) => nextDate(a, today).localeCompare(nextDate(b, today)));
}

/** Whole days from today to the date: 0 on the day, 1 the day before. */
export function dday(date, today) {
  return Math.round((Date.parse(`${date}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / 86400000);
}

/** Upcoming shows grouped by the month of their next date: [{ month: 'YYYY-MM', shows }]. */
export function groupByMonth(shows, today) {
  const groups = [];
  for (const show of upcoming(shows, today)) {
    const month = nextDate(show, today).slice(0, 7);
    const last = groups[groups.length - 1];
    if (last && last.month === month) last.shows.push(show);
    else groups.push({ month, shows: [show] });
  }
  return groups;
}
