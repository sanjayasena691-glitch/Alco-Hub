import React, { useState, useEffect } from 'react';
import {
  Target,
  Sparkles,
  Video,
  Package,
  TrendingUp,
  Layout,
  Search,
  ShieldCheck,
  Layers,
} from 'lucide-react';
import { ProductIconName } from '../types';

interface AppIconProps {
  iconUrl?: string;
  iconName?: ProductIconName;
  name: string;
  className?: string;
  iconClassName?: string;
}

export const AppIcon: React.FC<AppIconProps> = ({
  iconUrl,
  iconName = 'sparkles',
  name,
  className = 'w-full h-full object-contain p-1.5',
  iconClassName = 'w-5 h-5',
}) => {
  const [hasError, setHasError] = useState(false);

  // Reset error state if iconUrl changes
  useEffect(() => {
    setHasError(false);
  }, [iconUrl]);

  if (iconUrl && !hasError) {
    return (
      <img
        src={iconUrl}
        alt={name}
        loading="lazy"
        referrerPolicy="no-referrer"
        onError={() => setHasError(true)}
        className={className}
      />
    );
  }

  // Dynamic vector icon fallback based on iconName
  switch (iconName) {
    case 'target':
      return <Target className={iconClassName} aria-hidden="true" />;
    case 'video':
      return <Video className={iconClassName} aria-hidden="true" />;
    case 'package':
      return <Package className={iconClassName} aria-hidden="true" />;
    case 'trending-up':
      return <TrendingUp className={iconClassName} aria-hidden="true" />;
    case 'layout':
      return <Layout className={iconClassName} aria-hidden="true" />;
    case 'search':
      return <Search className={iconClassName} aria-hidden="true" />;
    case 'shield':
      return <ShieldCheck className={iconClassName} aria-hidden="true" />;
    case 'sparkles':
      return <Sparkles className={iconClassName} aria-hidden="true" />;
    default:
      return <Layers className={iconClassName} aria-hidden="true" />;
  }
};
