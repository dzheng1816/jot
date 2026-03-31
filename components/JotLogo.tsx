import React from 'react';
import { Image } from 'react-native';

interface Props {
  size?: number;
}

export function JotLogo({ size = 44 }: Props) {
  const width = size * 1.2;
  const height = size;

  return (
    <Image
      source={require('../assets/images/jot-logo-purple.png')}
      style={{ width, height }}
      resizeMode="contain"
    />
  );
}
