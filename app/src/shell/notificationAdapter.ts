import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import type { NotificationRequest } from '@/core/types';

export const HOWL_CATEGORY = 'dogochi.howl';
export const ACTION_DONE = 'dogochi.done';

const TAG = 'dogochiId';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export async function prepareNotificationChannel(): Promise<void> {
  // Кнопка «Звершено» на локскріні: засіб дали, але записати забули.
  await Notifications.setNotificationCategoryAsync(HOWL_CATEGORY, [
    { identifier: ACTION_DONE, buttonTitle: 'Звершено', options: { opensAppToForeground: false } },
  ]);

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('howl', {
      name: 'Виття',
      importance: Notifications.AndroidImportance.DEFAULT,
      lightColor: '#d9a54a',
      vibrationPattern: [0, 250, 250, 250],
    });
  }
}

/** Дозвіл просимо не на старті, а після Ритуалу виклику. Відмова нічого не ламає. */
export async function requestNotificationPermission(): Promise<boolean> {
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  if (!current.canAskAgain) return false;
  const asked = await Notifications.requestPermissionsAsync();
  return asked.granted;
}

export async function hasNotificationPermission(): Promise<boolean> {
  return (await Notifications.getPermissionsAsync()).granted;
}

/** Diff, а не сліпа перезаливка — інакше зайвий I/O і гонки на кожному відкритті. */
export async function syncNotifications(desired: NotificationRequest[], now: number): Promise<void> {
  if (!(await hasNotificationPermission())) return;

  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  const ours = scheduled.filter((s) => typeof s.content.data?.[TAG] === 'string');
  const liveIds = new Set(ours.map((s) => String(s.content.data![TAG])));
  const wantIds = new Set(desired.map((d) => d.id));

  await Promise.all(
    ours
      .filter((s) => !wantIds.has(String(s.content.data![TAG])))
      .map((s) => Notifications.cancelScheduledNotificationAsync(s.identifier)),
  );

  const toAdd = desired.filter((d) => !liveIds.has(d.id) && d.fireAt > now);
  for (const req of toAdd) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: req.title,
        body: req.body,
        categoryIdentifier: HOWL_CATEGORY,
        data: { [TAG]: req.id, routineId: req.routineId ?? null },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: new Date(req.fireAt),
        channelId: 'howl',
      },
    });
  }
}

export async function cancelAllOurNotifications(): Promise<void> {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    scheduled
      .filter((s) => typeof s.content.data?.[TAG] === 'string')
      .map((s) => Notifications.cancelScheduledNotificationAsync(s.identifier)),
  );
}

export function routineIdFromResponse(response: Notifications.NotificationResponse): string | null {
  if (response.actionIdentifier !== ACTION_DONE) return null;
  const raw = response.notification.request.content.data?.routineId;
  return typeof raw === 'string' ? raw : null;
}
