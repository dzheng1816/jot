import React from 'react';
import { View } from 'react-native';
import { priorityColor } from '../constants/theme';
import { Priority } from '../types/note';

interface Props {
  priority: Priority;
  size?: number;
}

export function PriorityDot({ priority, size = 8 }: Props) {
  const color = priorityColor(priority);
  if (!color) return null;

  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: color,
      }}
      accessibilityLabel={`${priority} priority`}
    />
  );
}
