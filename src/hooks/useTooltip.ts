import { useState, useEffect } from 'react';

export const useTooltip = () => {
  const [showTooltip, setShowTooltip] = useState(false);
  const [tooltipTimeout, setTooltipTimeout] = useState<NodeJS.Timeout | null>(null);

  const handleMouseEnter = () => {
    if (tooltipTimeout) {
      clearTimeout(tooltipTimeout);
    }
    setShowTooltip(true);
  };

  const handleMouseLeave = () => {
    if (tooltipTimeout) {
      clearTimeout(tooltipTimeout);
    }
    setShowTooltip(false);
  };

  const handleTouchStart = () => {
    if (tooltipTimeout) {
      clearTimeout(tooltipTimeout);
    }
    const timeout = setTimeout(() => {
      setShowTooltip(true);
    }, 500); // 500msの長押しでツールチップを表示
    setTooltipTimeout(timeout);
  };

  const handleTouchEnd = () => {
    if (tooltipTimeout) {
      clearTimeout(tooltipTimeout);
    }
    setShowTooltip(false);
  };

  useEffect(() => {
    return () => {
      if (tooltipTimeout) {
        clearTimeout(tooltipTimeout);
      }
    };
  }, [tooltipTimeout]);

  return {
    showTooltip,
    handleMouseEnter,
    handleMouseLeave,
    handleTouchStart,
    handleTouchEnd,
  };
}; 