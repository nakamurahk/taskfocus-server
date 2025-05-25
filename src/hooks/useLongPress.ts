import { useState, useCallback } from 'react';

interface LongPressHandlers {
  onMouseDown: (e: React.MouseEvent) => void;
  onMouseUp: (e: React.MouseEvent) => void;
  onMouseLeave: (e: React.MouseEvent) => void;
  onTouchStart: (e: React.TouchEvent) => void;
  onTouchEnd: (e: React.TouchEvent) => void;
  onTouchCancel: (e: React.TouchEvent) => void;
}

export const useLongPress = (
  onLongPress: () => void,
  delay: number = 500
): LongPressHandlers => {
  const [longPressTimer, setLongPressTimer] = useState<NodeJS.Timeout | null>(null);

  const start = useCallback((callback: () => void) => {
    const timer = setTimeout(() => {
      callback();
    }, delay);
    setLongPressTimer(timer);
  }, [delay]);

  const clear = useCallback(() => {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
    }
  }, [longPressTimer]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    start(onLongPress);
  }, [onLongPress, start]);

  const handleMouseUp = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    clear();
  }, [clear]);

  const handleMouseLeave = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    clear();
  }, [clear]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();
    start(onLongPress);
  }, [onLongPress, start]);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();
    clear();
  }, [clear]);

  const handleTouchCancel = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();
    clear();
  }, [clear]);

  return {
    onMouseDown: handleMouseDown,
    onMouseUp: handleMouseUp,
    onMouseLeave: handleMouseLeave,
    onTouchStart: handleTouchStart,
    onTouchEnd: handleTouchEnd,
    onTouchCancel: handleTouchCancel,
  };
}; 