import React from 'react';
import Ionicons from '@expo/vector-icons/Ionicons';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import Feather from '@expo/vector-icons/Feather';

type IconFamily = 'ionicons' | 'material-community' | 'feather';

interface IconProps {
  family?: IconFamily;
  name: string;
  size?: number;
  color?: string;
  style?: any;
}

export function Icon({ family = 'ionicons', name, size = 24, color = '#FFFFFF', style }: IconProps) {
  switch (family) {
    case 'material-community':
      return <MaterialCommunityIcons name={name as any} size={size} color={color} style={style} />;
    case 'feather':
      return <Feather name={name as any} size={size} color={color} style={style} />;
    case 'ionicons':
    default:
      return <Ionicons name={name as any} size={size} color={color} style={style} />;
  }
}
