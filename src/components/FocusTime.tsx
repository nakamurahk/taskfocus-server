import React, { useEffect, useRef, useState } from 'react';
import { useFocus } from '../contexts/FocusContext';
import { FaRegClock } from 'react-icons/fa';

// 残り時間（分）を計算
function getRemainingMinutes(config: any): number {
  const now = new Date();
  const [hours, minutes] = config.defaultTime.split(':').map(Number);
  const medicationTime = new Date();
  medicationTime.setHours(hours, minutes, 0, 0);
  if (medicationTime > now) medicationTime.setDate(medicationTime.getDate() - 1);
  const diffMin = (now.getTime() - medicationTime.getTime()) / (1000 * 60);
  const totalMin = (config.totalEffectDuration || 0) * 60;
  const remaining = Math.max(0, totalMin - diffMin);
  return Math.round(remaining);
}

// 残り時間テキスト
function formatRemainingText(min: number): string {
  if (min <= 0) return '終了';
  if (min < 60) return `残り${min}分`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m === 0 ? `残り${h}時間` : `残り${h}時間${m}分`;
}

// 状況説明文
function getFocusMessage(status: string, min: number): string {
  if (status === 'peak') return '今が一番集中できる時間帯です！';
  if (status === 'before_peak') return 'そろそろ集中力が上がってきます。ウォームアップに最適！';
  if (status === 'fading') return '集中力が少しずつ落ちてきています。短時間タスクや休憩も意識して。';
  if (status === 'off') return '集中のピークは過ぎました。無理せず自分のペースで。';
  if (status === 'skipped') return '今日は服薬していません。自分のペースで過ごしましょう。';
  return '';
}

const FocusTime: React.FC = () => {
  const {
    physicalCondition,
    setPhysicalCondition,
    medicationStatus,
    medicationConfig,
    medicationSkipped,
    isEffectModeOn
  } = useFocus();

  // Hooksは必ずトップレベルで呼び出す
  const [remaining, setRemaining] = useState(() => getRemainingMinutes(medicationConfig));
  const [status, setStatus] = useState(medicationStatus);
  const requestRef = useRef<number>();

  // アニメーションでゲージを減らす
  useEffect(() => {
    let start: number | null = null;
    let prevMin = getRemainingMinutes(medicationConfig);
    const totalMin = (medicationConfig.totalEffectDuration || 0) * 60;
    function animate(time: number) {
      if (start === null) start = time;
      const nowMin = getRemainingMinutes(medicationConfig);
      if (nowMin !== prevMin) {
        setRemaining(nowMin);
        prevMin = nowMin;
      }
      requestRef.current = requestAnimationFrame(animate);
    }
    requestRef.current = requestAnimationFrame(animate);
    return () => {
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }
    };
  }, [medicationConfig]);

  // ステータスも随時更新
  useEffect(() => {
    setStatus(medicationStatus);
  }, [medicationStatus]);

  // ゲージ幅計算
  const totalMin = (medicationConfig.totalEffectDuration || 0) * 60;
  const percent = totalMin === 0 ? 0 : Math.max(0, Math.min(100, (remaining / totalMin) * 100));

  // 色・スタイル
  const bgColor = '#E6F0FF';
  const cardStyle = {
    background: '#fff',
    borderRadius: 16,
    padding: '12px 16px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
    maxWidth: '600px',
    margin: '0 auto',
    width: '100%'
  };
  const barBg = '#BFD9FF';
  const barColor = '#007BFF';

  // 薬効モードがOFFの場合は何も表示しない
  if (!isEffectModeOn) {
    return null;
  }

  return (
    <div style={{ width: '100%', margin: '0 0 12px 0' }}>
      <div style={cardStyle} className="flex flex-col items-center">
        {/* 残り時間テキスト＋アイコン */}
        <div style={{ display: 'flex', alignItems: 'center', color: '#007BFF', fontWeight: 'bold', fontSize: 16, marginBottom: 8, marginTop: 4 }}>
          <FaRegClock style={{ marginRight: 6, fontSize: 18 }} />
          {formatRemainingText(remaining)}
        </div>
        {/* 集中ゲージ */}
        <div style={{ width: '90%', maxWidth: 400, margin: '0 auto', marginBottom: 16 }}>
          <div style={{ background: barBg, borderRadius: 8, height: 24, width: '100%', overflow: 'hidden', position: 'relative' }}>
            <div
              style={{
                width: `${percent}%`,
                background: barColor,
                height: '100%',
                borderRadius: 8,
                transition: 'width 0.5s cubic-bezier(.4,2,.6,1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                fontWeight: 600,
                fontSize: 16,
                boxShadow: percent > 0 ? '0 2px 8px #007BFF33' : undefined
              }}
            >
              {/* バー内は無地 or %表示 */}
              {/* <span>{percent.toFixed(0)}%</span> */}
            </div>
          </div>
        </div>
        {/* 説明文 */}
        <div style={{ textAlign: 'center', fontSize: 16, color: '#222', marginTop: 8, fontWeight: 500 }}>
          {getFocusMessage(status, remaining)}
        </div>
      </div>
    </div>
  );
};

export default FocusTime; 