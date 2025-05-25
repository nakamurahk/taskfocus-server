import { parseISO } from 'date-fns';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import { addHours } from 'date-fns';

// 'YYYY-MM-DD HH:mm:ss' → UTCとしてDateオブジェクト化
export function parseUTCDateString(dateStr: string): Date {
  // 'YYYY-MM-DD HH:mm:ss' → 'YYYY-MM-DDTHH:mm:ssZ'
  return new Date(dateStr.replace(' ', 'T') + 'Z');
}

export const formatDuration = (minutes?: number) => {
  if (!minutes) return '未設定';
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours > 0) {
    return `${hours}時間${mins}分`;
  }
  return `${mins}分`;
};

export const formatDeadline = (dateStr?: string) => {
  if (!dateStr) return '';
  const date = parseISO(dateStr);
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  if (date.toDateString() === today.toDateString()) {
    return '今日';
  } else if (date.toDateString() === tomorrow.toDateString()) {
    return '明日';
  } else {
    return `${date.getMonth() + 1}月${date.getDate()}日`;
  }
};

export const formatDateForDisplay = (dateStr?: string) => {
  if (!dateStr) return '';
  const date = parseISO(dateStr);
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${month}/${day}`;
};

export const formatDateWithDayForDetail = (dateStr?: string) => {
  if (!dateStr) return '';
  const date = parseISO(dateStr);
  return format(date, 'yyyy/MM/dd (EEEE)', { locale: ja });
};

/**
 * UTCの日付をJSTに変換する
 * @param date UTCの日付
 * @returns JSTの日付
 */
export const toJST = (date: Date | string): Date => {
  let utcDate: Date;
  if (typeof date === 'string') {
    // ISO8601形式かどうか判定
    if (/T.*Z$/.test(date)) {
      utcDate = new Date(date);
    } else {
      utcDate = parseUTCDateString(date);
    }
  } else {
    utcDate = date;
  }
  return addHours(utcDate, 9);
};

/**
 * 日付が今日かどうかを判定する（JST基準）
 * @param date 判定する日付
 * @returns 今日の日付かどうか
 */
export const isToday = (date: Date | string): boolean => {
  const jstDate = toJST(date);
  const today = new Date();
  
  // 時刻を0時0分0秒にリセットして比較
  const jstDateOnly = new Date(jstDate.getFullYear(), jstDate.getMonth(), jstDate.getDate());
  const todayOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  
  return jstDateOnly.getTime() === todayOnly.getTime();
}; 