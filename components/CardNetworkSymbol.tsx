import React from 'react';
import Svg, { Circle, Rect, Path, Text as SvgText, G } from 'react-native-svg';
import type { CardType } from '@/lib/types';

interface CardNetworkSymbolProps {
  type: CardType;
  width?: number;
  height?: number;
}

export function CardNetworkSymbol({
  type,
  width,
  height,
}: CardNetworkSymbolProps) {
  switch (type) {
    case 'VISA':
      return (
        <Svg
          width={width ?? 52}
          height={height ?? 24}
          viewBox="0 0 54 24"
          fill="none"
        >
          {/* Authentic Visa gold flick on top left of V */}
          <Path d="M7 6L11 6L9 11Z" fill="#F7B600" />
          <SvgText
            x="30"
            y="18"
            textAnchor="middle"
            fill="#FFFFFF"
            fontSize="17"
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
        <Svg
          width={width ?? 46}
          height={height ?? 26}
          viewBox="0 0 46 26"
          fill="none"
        >
          {/* Authentic Mastercard overlapping dual circles */}
          <Circle cx="16" cy="13" r="11" fill="#EB001B" />
          <Circle cx="30" cy="13" r="11" fill="#F79E1B" fillOpacity="0.9" />
        </Svg>
      );

    case 'RUPAY':
      return (
        <Svg
          width={width ?? 68}
          height={height ?? 24}
          viewBox="0 0 68 24"
          fill="none"
        >
          {/* Authentic RuPay wordmark in white */}
          <SvgText
            x="24"
            y="17"
            textAnchor="middle"
            fill="#FFFFFF"
            fontSize="14"
            fontWeight="bold"
            fontStyle="italic"
            letterSpacing="0.5"
          >
            RuPay
          </SvgText>
          {/* Authentic RuPay dual fast-forward chevrons: Orange & Green */}
          <Path
            d="M48 6L54 12L48 18L52 18L58 12L52 6Z"
            fill="#F47920"
          />
          <Path
            d="M56 6L62 12L56 18L60 18L66 12L60 6Z"
            fill="#018C45"
          />
        </Svg>
      );

    case 'AMEX':
      return (
        <Svg
          width={width ?? 48}
          height={height ?? 24}
          viewBox="0 0 48 24"
          fill="none"
        >
          <Rect
            x="1"
            y="2"
            width="46"
            height="20"
            rx="4"
            fill="#006FCF"
            stroke="#005CA8"
            strokeWidth="1"
          />
          <SvgText
            x="24"
            y="16"
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
