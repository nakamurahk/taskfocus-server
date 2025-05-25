import { useReducer, useRef, useCallback } from 'react';

type GestureType = 'tap' | 'longpress' | 'swipe' | null;

interface GestureState {
  actionLocked: boolean;
  gestureType: GestureType;
  tapTimestamp: number;
  touchStartPos: { x: number; y: number } | null;
  swipeDistance: number;
}

type Action =
  | { type: 'TOUCH_START'; pos: { x: number; y: number }; timestamp: number }
  | { type: 'TOUCH_END'; pos: { x: number; y: number }; timestamp: number }
  | { type: 'LONG_PRESS' }
  | { type: 'SWIPE'; direction: 'left' | 'right' }
  | { type: 'UPDATE_SWIPE_DISTANCE'; distance: number }
  | { type: 'RESET' };

const initialState: GestureState = {
  actionLocked: false,
  gestureType: null,
  tapTimestamp: 0,
  touchStartPos: null,
  swipeDistance: 0,
};

function reducer(state: GestureState, action: Action): GestureState {
  if (state.actionLocked && action.type !== 'RESET') return state;
  switch (action.type) {
    case 'TOUCH_START':
      return {
        ...state,
        tapTimestamp: action.timestamp,
        touchStartPos: action.pos,
        gestureType: null,
        swipeDistance: 0,
      };
    case 'LONG_PRESS':
      return {
        ...state,
        actionLocked: true,
        gestureType: 'longpress',
        swipeDistance: 0,
      };
    case 'SWIPE':
      if (state.gestureType === 'longpress' || state.gestureType === 'swipe') return state;
      return {
        ...state,
        actionLocked: true,
        gestureType: 'swipe'
      };
    case 'UPDATE_SWIPE_DISTANCE':
      return {
        ...state,
        swipeDistance: action.distance,
      };
    case 'TOUCH_END': {
      if (state.gestureType === 'longpress' || state.gestureType === 'swipe') return { ...state, swipeDistance: 0 };
      const duration = action.timestamp - state.tapTimestamp;
      const dx = state.touchStartPos ? action.pos.x - state.touchStartPos.x : 0;
      const dy = state.touchStartPos ? action.pos.y - state.touchStartPos.y : 0;
      const distance = Math.sqrt(dx * dx + dy * dy);
      if (duration < 200 && distance < 10) {
        return {
          ...state,
          actionLocked: true,
          gestureType: 'tap',
          swipeDistance: 0,
        };
      }
      return { ...state, swipeDistance: 0 };
    }
    case 'RESET':
      return { ...initialState };
    default:
      return state;
  }
}

type GestureReducerOptions = {
  onTap?: () => void;
  onLongPress?: () => void;
  onSwipe?: (direction: 'left' | 'right') => void;
  longPressDelay?: number;
  swipeThreshold?: number;
  resetDelay?: number;
};

export function useGestureReducer(options: GestureReducerOptions = {}) {
  const {
    onTap,
    onLongPress,
    onSwipe,
    longPressDelay = 500,
    swipeThreshold = 30,
    resetDelay = 300,
  } = options;
  const [state, dispatch] = useReducer(reducer, initialState);

  // refs for gesture tracking
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // --- Handlers ---
  const onTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length !== 1) return;
    const x = e.touches[0].clientX;
    const y = e.touches[0].clientY;
    const now = Date.now();
    dispatch({ type: 'TOUCH_START', pos: { x, y }, timestamp: now });
    timerRef.current = setTimeout(() => {
      dispatch({ type: 'LONG_PRESS' });
      onLongPress && onLongPress();
      setTimeout(() => dispatch({ type: 'RESET' }), resetDelay);
    }, longPressDelay);
  }, [onLongPress, longPressDelay, resetDelay]);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    if (state.actionLocked || !state.touchStartPos) return;
    const x = e.touches[0].clientX;
    const y = e.touches[0].clientY;
    const dx = x - state.touchStartPos.x;
    const dy = y - state.touchStartPos.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    // スクロール判定（縦方向の移動が横方向より大きい場合）
    if (Math.abs(dy) > Math.abs(dx) && Math.abs(dy) > 5) {
      clearTimeout(timerRef.current!);
      dispatch({ type: 'RESET' });
      return;
    }

    // スワイプ距離を常に更新
    dispatch({ type: 'UPDATE_SWIPE_DISTANCE', distance: dx });

    if (Math.abs(dx) > swipeThreshold && Math.abs(dx) > Math.abs(dy)) {
      clearTimeout(timerRef.current!);
      const direction = dx > 0 ? 'right' : 'left';
      dispatch({ type: 'SWIPE', direction });
      onSwipe && onSwipe(direction);
      setTimeout(() => dispatch({ type: 'RESET' }), resetDelay);
    }
  }, [onSwipe, swipeThreshold, state.actionLocked, state.touchStartPos, resetDelay]);

  const onTouchEnd = useCallback((e: React.TouchEvent) => {
    clearTimeout(timerRef.current!);
    if (state.actionLocked || !state.touchStartPos) return;
    const x = e.changedTouches[0].clientX;
    const y = e.changedTouches[0].clientY;
    const now = Date.now();
    dispatch({ type: 'TOUCH_END', pos: { x, y }, timestamp: now });
    setTimeout(() => {
      if (state.gestureType === 'tap') {
        onTap && onTap();
      }
      dispatch({ type: 'RESET' });
    }, 0);
  }, [onTap, state.actionLocked, state.touchStartPos, state.gestureType]);

  const onTouchCancel = useCallback(() => {
    clearTimeout(timerRef.current!);
    dispatch({ type: 'RESET' });
  }, []);

  // Mouse（PC用、タッチと同様のロジック）
  const onMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return;
    const x = e.clientX;
    const y = e.clientY;
    const now = Date.now();
    dispatch({ type: 'TOUCH_START', pos: { x, y }, timestamp: now });
    timerRef.current = setTimeout(() => {
      dispatch({ type: 'LONG_PRESS' });
      onLongPress && onLongPress();
      setTimeout(() => dispatch({ type: 'RESET' }), resetDelay);
    }, longPressDelay);
  }, [onLongPress, longPressDelay, resetDelay]);

  const onMouseMove = useCallback((e: React.MouseEvent) => {
    if (state.actionLocked || !state.touchStartPos) return;
    const x = e.clientX;
    const y = e.clientY;
    const dx = x - state.touchStartPos.x;
    const dy = y - state.touchStartPos.y;

    // スワイプ距離を常に更新
    dispatch({ type: 'UPDATE_SWIPE_DISTANCE', distance: dx });

    if (Math.abs(dx) > swipeThreshold && Math.abs(dx) > Math.abs(dy)) {
      clearTimeout(timerRef.current!);
      const direction = dx > 0 ? 'right' : 'left';
      dispatch({ type: 'SWIPE', direction });
      onSwipe && onSwipe(direction);
      setTimeout(() => dispatch({ type: 'RESET' }), resetDelay);
    }
  }, [onSwipe, swipeThreshold, state.actionLocked, state.touchStartPos, resetDelay]);

  const onMouseUp = useCallback((e: React.MouseEvent) => {
    clearTimeout(timerRef.current!);
    if (state.actionLocked || !state.touchStartPos) return;
    const x = e.clientX;
    const y = e.clientY;
    const now = Date.now();
    dispatch({ type: 'TOUCH_END', pos: { x, y }, timestamp: now });
    setTimeout(() => {
      if (state.gestureType === 'tap') {
        onTap && onTap();
      }
      dispatch({ type: 'RESET' });
    }, 0);
  }, [onTap, state.actionLocked, state.touchStartPos, state.gestureType]);

  const onMouseLeave = useCallback(() => {
    clearTimeout(timerRef.current!);
    dispatch({ type: 'RESET' });
  }, []);

  const gestureHandlers = {
    onTouchStart,
    onTouchMove,
    onTouchEnd,
    onTouchCancel,
    onMouseDown,
    onMouseMove,
    onMouseUp,
    onMouseLeave,
  };

  return { state, dispatch, gestureHandlers };
} 