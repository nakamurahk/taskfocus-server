import React from 'react';

interface HurdleEmojiProps {
  level: number;
}

export const HurdleEmoji: React.FC<HurdleEmojiProps> = ({ level }) => {
  // 常に3つ表示。level分だけ通常色、残りはグレー＋opacity
  return (
    <span>
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          style={{
            color: i < level ? '#FFD600' : '#BDBDBD',
            opacity: i < level ? 1 : 0.4,
            fontWeight: 'bold',
            fontSize: '1em',
            marginRight: i < 2 ? 2 : 0
          }}
        >
          ⚡
        </span>
      ))}
    </span>
  );
}; 