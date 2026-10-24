import { getAllLogs } from './repo';

function csvEscape(value: string | number): string {
  const text = String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export async function exportCsv(): Promise<void> {
  const header = 'date,hour,status,did,next,goal,tags,backfilled,logged_at';
  const body = getAllLogs().map((row) =>
    [row.date, row.hour, row.status, row.did, row.next, row.goal, row.tags, row.backfilled, row.logged_at]
      .map(csvEscape)
      .join(',')
  );
  const blob = new Blob([[header, ...body, ''].join('\n')], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `hour-tracker-export-${Date.now()}.csv`;
  anchor.click();
  URL.revokeObjectURL(url);
}
