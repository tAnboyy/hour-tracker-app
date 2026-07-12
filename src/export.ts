import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { getAllLogs } from './repo';

function csvEscape(v: string | number): string {
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export async function exportCsv() {
  const rows = getAllLogs();
  const header = 'date,hour,status,did,next,goal,tags,backfilled,logged_at';
  const body = rows
    .map((r) =>
      [r.date, r.hour, r.status, r.did, r.next, r.goal, r.tags, r.backfilled, r.logged_at].map(csvEscape).join(',')
    )
    .join('\n');
  const file = new File(Paths.cache, `hour-tracker-export-${Date.now()}.csv`);
  file.create();
  file.write(`${header}\n${body}\n`);
  await Sharing.shareAsync(file.uri, { mimeType: 'text/csv', dialogTitle: 'Export hour logs' });
}
