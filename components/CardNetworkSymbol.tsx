import React from 'react';
import Svg, { Circle, Rect, Path, Text as SvgText } from 'react-native-svg';
import type { CardType } from '@/lib/types';

interface CardNetworkSymbolProps {
  type: CardType;
  width?: number;
  height?: number;
  monochrome?: boolean;
}

export function CardNetworkSymbol({
  type,
  width = 44,
  height = 26,
  monochrome = false,
}: CardNetworkSymbolProps) {
  switch (type) {
    case 'VISA':
      return (
        <Svg width={width} height={height} viewBox="0 0 48 26" fill="none">
          <SvgText
            x="24"
            y="18"
            textAnchor="middle"
            fill={monochrome ? '#FFFFFF' : '#1A1F71'}
            fontSize="16"
            fontWeight="bold"
            fontStyle="italic"
            letterSpacing="2"
          >
            VISA
          </SvgText>
        </Svg>
      );

    case 'MASTERCARD':
      return (
        <Svg width={width} height={height} viewBox="0 0 44 26" fill="none">
          <Circle cx="16" cy="13" r="11" fill={monochrome ? '#FFFFFF' : '#EB001B'} />
          <Circle
            cx="28"
            cy="13"
            r="11"
            fill={monochrome ? '#FFFFFF' : '#F79E1B'}
            fillOpacity={monochrome ? 0.6 : 0.9}
          />
        </Svg>
      );

    case 'RUPAY':
      return (
        <Svg width={width} height={height} viewBox="0 0 54 26" fill="none">
          <Path
            d="M5 4L13 4L10 22L2 22Z"
            fill={monochrome ? '#FFFFFF' : '#0972B8'}
          />
          <Path
            d="M13 4L21 4L18 22L10 22Z"
            fill={monochrome ? '#FFFFFF' : '#F37021'}
          />
          <SvgText
            x="23"
            y="18"
            fill={monochrome ? '#FFFFFF' : '#FFFFFF'}
            fontSize="12"
            fontWeight="bold"
            letterSpacing="0.5"
          >
            RuPay
          </SvgText>
        </Svg>
      );

    case 'AMEX':
      return (
        <Svg width={width} height={height} viewBox="0 0 46 26" fill="none">
          <Rect
            x="1"
            y="2"
            width="44"
            height="22"
            rx="4"
            fill={monochrome ? '#333333' : '#006FCF'}
            stroke={monochrome ? '#FFFFFF' : '#005CA8'}
            strokeWidth="1"
          />
          <SvgText
            x="23"
            y="17"
            textAnchor="middle"
            fill="#FFFFFF"
            fontSize="10"
            fontWeight="bold"
            letterSpacing="1.2"
          >
            AMEX
          </SvgText>
        </Svg>
      );

    default:
      return null;
  }
}
