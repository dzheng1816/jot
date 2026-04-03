import { Alert, Platform } from 'react-native';

export function confirmAction(
  title: string,
  message: string | undefined,
  onConfirm: () => void,
  confirmLabel = 'OK'
): void {
  if (Platform.OS === 'web') {
    const msg = message ? `${title}\n\n${message}` : title;
    if (window.confirm(msg)) {
      onConfirm();
    }
  } else {
    Alert.alert(title, message, [
      { text: 'Cancel', style: 'cancel' },
      { text: confirmLabel, style: 'destructive', onPress: onConfirm },
    ]);
  }
}
