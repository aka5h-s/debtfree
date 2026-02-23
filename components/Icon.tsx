import React from 'react';
import { View } from 'react-native';
import Svg, { Path, Circle, Rect, Line, Polyline, G } from 'react-native-svg';

type IconFamily = 'ionicons' | 'material-community' | 'feather';

interface IconProps {
  family?: IconFamily;
  name: string;
  size?: number;
  color?: string;
  style?: any;
}

function renderPath(name: string, color: string, size: number): React.ReactNode {
  const s = size;
  const sc = s / 24;

  const svgProps = { width: s, height: s, viewBox: "0 0 24 24", fill: "none" as const };

  switch (name) {
    case 'home':
      return <Svg {...svgProps}><Path d="M3 9.5L12 2l9 7.5V20a2 2 0 01-2 2H5a2 2 0 01-2-2V9.5z" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" /><Path d="M9 22V12h6v10" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" /></Svg>;
    case 'wallet':
      return <Svg {...svgProps}><Rect x="2" y="4" width="20" height="16" rx="2" stroke={color} strokeWidth={2} /><Path d="M2 10h20" stroke={color} strokeWidth={2} /><Circle cx="17" cy="14.5" r="1.5" fill={color} /></Svg>;
    case 'add':
      return <Svg {...svgProps}><Line x1="12" y1="5" x2="12" y2="19" stroke={color} strokeWidth={2} strokeLinecap="round" /><Line x1="5" y1="12" x2="19" y2="12" stroke={color} strokeWidth={2} strokeLinecap="round" /></Svg>;
    case 'close':
    case 'x':
      return <Svg {...svgProps}><Line x1="18" y1="6" x2="6" y2="18" stroke={color} strokeWidth={2} strokeLinecap="round" /><Line x1="6" y1="6" x2="18" y2="18" stroke={color} strokeWidth={2} strokeLinecap="round" /></Svg>;
    case 'close-circle':
      return <Svg {...svgProps}><Circle cx="12" cy="12" r="10" stroke={color} strokeWidth={2} /><Line x1="15" y1="9" x2="9" y2="15" stroke={color} strokeWidth={2} strokeLinecap="round" /><Line x1="9" y1="9" x2="15" y2="15" stroke={color} strokeWidth={2} strokeLinecap="round" /></Svg>;
    case 'checkmark':
      return <Svg {...svgProps}><Polyline points="20 6 9 17 4 12" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" fill="none" /></Svg>;
    case 'checkmark-circle':
      return <Svg {...svgProps}><Circle cx="12" cy="12" r="10" stroke={color} strokeWidth={2} /><Polyline points="16 9 10.5 15 8 12.5" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" fill="none" /></Svg>;
    case 'search':
      return <Svg {...svgProps}><Circle cx="11" cy="11" r="7" stroke={color} strokeWidth={2} /><Line x1="16.5" y1="16.5" x2="21" y2="21" stroke={color} strokeWidth={2} strokeLinecap="round" /></Svg>;
    case 'arrow-back':
      return <Svg {...svgProps}><Line x1="19" y1="12" x2="5" y2="12" stroke={color} strokeWidth={2} strokeLinecap="round" /><Polyline points="12 19 5 12 12 5" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" fill="none" /></Svg>;
    case 'chevron-forward':
      return <Svg {...svgProps}><Polyline points="9 18 15 12 9 6" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" fill="none" /></Svg>;
    case 'alert-circle':
      return <Svg {...svgProps}><Circle cx="12" cy="12" r="10" stroke={color} strokeWidth={2} /><Line x1="12" y1="8" x2="12" y2="12" stroke={color} strokeWidth={2} strokeLinecap="round" /><Circle cx="12" cy="16" r="1" fill={color} /></Svg>;
    case 'stats-chart':
      return <Svg {...svgProps}><Rect x="4" y="14" width="4" height="6" rx="1" fill={color} /><Rect x="10" y="8" width="4" height="12" rx="1" fill={color} /><Rect x="16" y="4" width="4" height="16" rx="1" fill={color} /></Svg>;
    case 'card':
    case 'credit-card':
      return <Svg {...svgProps}><Rect x="2" y="4" width="20" height="16" rx="2" stroke={color} strokeWidth={2} /><Line x1="2" y1="10" x2="22" y2="10" stroke={color} strokeWidth={2} /></Svg>;
    case 'card-outline':
      return <Svg {...svgProps}><Rect x="2" y="4" width="20" height="16" rx="2" stroke={color} strokeWidth={2} /><Line x1="2" y1="10" x2="22" y2="10" stroke={color} strokeWidth={2} /></Svg>;
    case 'person-circle':
      return <Svg {...svgProps}><Circle cx="12" cy="12" r="10" stroke={color} strokeWidth={2} /><Circle cx="12" cy="9" r="3" stroke={color} strokeWidth={2} /><Path d="M6.168 18.849A4 4 0 0110 16h4a4 4 0 013.834 2.855" stroke={color} strokeWidth={2} strokeLinecap="round" /></Svg>;
    case 'people-outline':
      return <Svg {...svgProps}><Circle cx="9" cy="7" r="3" stroke={color} strokeWidth={2} /><Path d="M3 21v-1a4 4 0 014-4h4a4 4 0 014 4v1" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" /><Circle cx="17" cy="7" r="3" stroke={color} strokeWidth={2} /><Path d="M21 21v-1a4 4 0 00-3-3.87" stroke={color} strokeWidth={2} strokeLinecap="round" /></Svg>;
    case 'trash-outline':
      return <Svg {...svgProps}><Polyline points="3 6 5 6 21 6" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" fill="none" /><Path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" /><Path d="M10 3h4a1 1 0 011 1v2H9V4a1 1 0 011-1z" stroke={color} strokeWidth={2} /></Svg>;
    case 'create-outline':
      return <Svg {...svgProps}><Path d="M17 3a2.828 2.828 0 114 4L7.5 20.5 2 22l1.5-5.5L17 3z" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" /></Svg>;
    case 'time-outline':
      return <Svg {...svgProps}><Circle cx="12" cy="12" r="10" stroke={color} strokeWidth={2} /><Polyline points="12 6 12 12 16 14" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" fill="none" /></Svg>;
    case 'receipt-outline':
    case 'document-text-outline':
      return <Svg {...svgProps}><Path d="M4 4a2 2 0 012-2h8l6 6v12a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" /><Polyline points="14 2 14 8 20 8" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" fill="none" /><Line x1="8" y1="13" x2="16" y2="13" stroke={color} strokeWidth={2} strokeLinecap="round" /><Line x1="8" y1="17" x2="13" y2="17" stroke={color} strokeWidth={2} strokeLinecap="round" /></Svg>;
    case 'cloud-done':
      return <Svg {...svgProps}><Path d="M18 10h-1.26A8 8 0 109 20h9a5 5 0 000-10z" stroke={color} strokeWidth={2} strokeLinejoin="round" /><Polyline points="10 15 12 17 16 13" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" fill="none" /></Svg>;
    case 'log-out-outline':
      return <Svg {...svgProps}><Path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" /><Polyline points="16 17 21 12 16 7" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" fill="none" /><Line x1="21" y1="12" x2="9" y2="12" stroke={color} strokeWidth={2} strokeLinecap="round" /></Svg>;
    case 'logo-google':
      return <Svg {...svgProps}><Path d="M21.8 10.4h-9.4v3.4h5.5c-.5 2.5-2.6 3.8-5.5 3.8-3.3 0-6-2.7-6-6s2.7-6 6-6c1.5 0 2.8.5 3.9 1.4l2.6-2.6C17.2 2.7 14.8 1.6 12.4 1.6c-5.7 0-10 4.3-10 10s4.3 10 10 10c5 0 9.6-3.6 9.6-10 0-.5-.1-1.1-.2-1.6z" fill={color} /></Svg>;
    case 'eye':
      return <Svg {...svgProps}><Path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke={color} strokeWidth={2} strokeLinejoin="round" /><Circle cx="12" cy="12" r="3" stroke={color} strokeWidth={2} /></Svg>;
    case 'eye-off':
      return <Svg {...svgProps}><Path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" /><Path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" /><Line x1="1" y1="1" x2="23" y2="23" stroke={color} strokeWidth={2} strokeLinecap="round" /><Path d="M14.12 14.12a3 3 0 01-4.24-4.24" stroke={color} strokeWidth={2} strokeLinecap="round" /></Svg>;
    case 'hand-left-outline':
      return <Svg {...svgProps}><Path d="M18 11V6a2 2 0 00-4 0v1M14 7V4a2 2 0 00-4 0v4M10 8V5a2 2 0 00-4 0v9l-1.8-1.8a2 2 0 00-2.83 2.83L7 20.65A6 6 0 0011.24 22H14a6 6 0 006-6v-5a2 2 0 00-4 0v0" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" /></Svg>;
    case 'credit-card-multiple':
      return <Svg {...svgProps}><Rect x="2" y="6" width="18" height="14" rx="2" stroke={color} strokeWidth={2} /><Line x1="2" y1="12" x2="20" y2="12" stroke={color} strokeWidth={2} /><Path d="M6 4h14a2 2 0 012 2v1" stroke={color} strokeWidth={2} strokeLinecap="round" /></Svg>;
    case 'credit-card-chip':
      return <Svg {...svgProps}><Rect x="2" y="4" width="20" height="16" rx="2" stroke={color} strokeWidth={2} /><Line x1="2" y1="10" x2="22" y2="10" stroke={color} strokeWidth={2} /><Rect x="5" y="13" width="4" height="3" rx="0.5" stroke={color} strokeWidth={1.5} /></Svg>;
    default:
      return <Svg {...svgProps}><Circle cx="12" cy="12" r="10" stroke={color} strokeWidth={2} /><Line x1="12" y1="8" x2="12" y2="12" stroke={color} strokeWidth={2} strokeLinecap="round" /><Circle cx="12" cy="16" r="1" fill={color} /></Svg>;
  }
}

export function Icon({ family = 'ionicons', name, size = 24, color = '#FFFFFF', style }: IconProps) {
  return (
    <View style={[{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }, style]}>
      {renderPath(name, color, size)}
    </View>
  );
}
