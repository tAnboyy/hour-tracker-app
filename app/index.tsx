import { Redirect } from 'expo-router';
import { kvGet } from '../src/db';
import { getBacklogDays, getSettings } from '../src/repo';

export default function Index() {
  if (!kvGet('onboarded')) return <Redirect href="/onboarding" />;
  if (getBacklogDays(getSettings()).length > 0) return <Redirect href="/backlog" />;
  return <Redirect href="/log" />;
}
