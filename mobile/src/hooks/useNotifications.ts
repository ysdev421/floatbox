import { useEffect } from 'react';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export function useNotifications(enabled: boolean) {
  useEffect(() => {
    if (!enabled) {
      Notifications.cancelAllScheduledNotificationsAsync();
      return;
    }

    async function requestPermissions() {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      if (finalStatus !== 'granted') {
        console.log('Failed to get push token for push notification!');
        return;
      }
      if (Platform.OS === 'android') {
        Notifications.setNotificationChannelAsync('default', {
          name: 'default',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#5e6ad2',
        });
      }
    }

    requestPermissions();
  }, [enabled]);

  const scheduleTaskNotification = async (taskId: string, title: string, dueDateStr: string | null) => {
    // 既存の通知をキャンセル（更新時に二重登録を防ぐため）
    await Notifications.cancelScheduledNotificationAsync(taskId);

    if (!enabled || !dueDateStr) return;

    const [year, month, day] = dueDateStr.split('-').map(Number);
    // 当日の朝9時に設定
    const triggerDate = new Date(year, month - 1, day, 9, 0, 0);

    // すでに過ぎている場合はスケジュールしない
    if (triggerDate.getTime() <= Date.now()) {
      return;
    }

    await Notifications.scheduleNotificationAsync({
      identifier: taskId,
      content: {
        title: 'FloatBox リマインダー',
        body: `「${title}」の期限が本日です！`,
        sound: true,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: triggerDate,
      },
    });
  };

  const cancelTaskNotification = async (taskId: string) => {
    await Notifications.cancelScheduledNotificationAsync(taskId);
  };

  return { scheduleTaskNotification, cancelTaskNotification };
}
