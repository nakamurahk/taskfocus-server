import { addHours, format } from 'date-fns';

// UTCのDateまたはISO8601文字列を日本時間（+9h）に変換
export function toJST(date: Date | string): Date {
  const d = typeof date === 'string' ? new Date(date) : date;
  return addHours(d, 9);
}

// 日本時間でフォーマットした文字列を返す
export function formatJST(date: Date | string, formatStr: string): string {
  const jstDate = toJST(date);
  return format(jstDate, formatStr);
}

// 使い方例：
// const jstDate = toJST('2025-05-15T03:07:13.032Z');
// const jstString = formatJST('2025-05-15T03:07:13.032Z', 'yyyy-MM-dd HH:mm:ss'); 