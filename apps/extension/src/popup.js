const PWA_URL = 'https://hour-tracker.expo.app';
const byId = (id) => document.getElementById(id);

async function load() {
  const { currentGoal = '', pendingLogs = [] } = await chrome.storage.local.get(['currentGoal', 'pendingLogs']);
  byId('currentGoal').textContent = currentGoal || 'No goal set';
  byId('syncState').textContent = pendingLogs.length ? `${pendingLogs.length} pending` : 'Ready';
}

byId('save').addEventListener('click', async () => {
  const did = byId('did').value.trim();
  const nextGoal = byId('nextGoal').value.trim();
  if (!did) {
    byId('status').textContent = 'Describe the last hour before saving.';
    return;
  }
  const { pendingLogs = [] } = await chrome.storage.local.get('pendingLogs');
  const now = new Date();
  const completed = new Date(now.getTime() - 60 * 60 * 1000);
  pendingLogs.push({
    id: crypto.randomUUID(),
    date: completed.toLocaleDateString('en-CA'),
    hour: completed.getHours(),
    did,
    nextGoal,
    createdAt: now.toISOString(),
  });
  await chrome.storage.local.set({ pendingLogs, currentGoal: nextGoal });
  byId('did').value = '';
  byId('nextGoal').value = '';
  byId('status').textContent = 'Saved locally; account sync will send it when connected.';
  await load();
});

byId('openApp').addEventListener('click', () => chrome.tabs.create({ url: PWA_URL }));
byId('openOptions').addEventListener('click', () => chrome.runtime.openOptionsPage());
load();
