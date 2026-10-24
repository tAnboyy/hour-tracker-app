const ALARM_NAME = 'hour-tracker-hourly';
const DEFAULT_SETTINGS = { startHour: 8, endHour: 23, activeDays: [0, 1, 2, 3, 4, 5, 6], remindersEnabled: false };

async function getSettings() {
  const { settings } = await chrome.storage.local.get('settings');
  return { ...DEFAULT_SETTINGS, ...(settings || {}) };
}

function nextHourBoundary(now = new Date()) {
  const next = new Date(now);
  next.setMinutes(0, 0, 0);
  next.setHours(next.getHours() + 1);
  return next.getTime();
}

async function reconcileAlarm() {
  const settings = await getSettings();
  await chrome.alarms.clear(ALARM_NAME);
  if (!settings.remindersEnabled) return;
  chrome.alarms.create(ALARM_NAME, { when: nextHourBoundary(), periodInMinutes: 60 });
}

chrome.runtime.onInstalled.addListener(() => reconcileAlarm());
chrome.runtime.onStartup.addListener(() => reconcileAlarm());
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && changes.settings) reconcileAlarm();
});

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name !== ALARM_NAME) return;
  const now = new Date();
  const settings = await getSettings();
  const completedHour = (now.getHours() + 23) % 24;
  const completedDate = new Date(now);
  if (now.getHours() === 0) completedDate.setDate(completedDate.getDate() - 1);
  if (!settings.activeDays.includes(completedDate.getDay()) || completedHour < settings.startHour || completedHour >= settings.endHour) return;

  chrome.notifications.create(`hour-${completedDate.toISOString().slice(0, 10)}-${completedHour}`, {
    type: 'basic',
    iconUrl: '../icons/icon-128.png',
    title: 'Log the last hour',
    message: 'What did you do, and what will you focus on next?',
    priority: 2,
  });
});

chrome.notifications.onClicked.addListener(() => chrome.action.openPopup());

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type !== 'TEST_NOTIFICATION') return false;
  chrome.notifications.create('hour-tracker-test', {
    type: 'basic',
    iconUrl: '../icons/icon-128.png',
    title: 'Hour Tracker test',
    message: 'Desktop reminders are working.',
  });
  sendResponse({ ok: true });
  return true;
});
