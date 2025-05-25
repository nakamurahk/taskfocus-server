import React from 'react';
import { useLocation } from 'react-router-dom';

const Header: React.FC = () => {
  const location = useLocation();
  // 今日の日付をYYYY/MM/DD（曜）形式で取得
  const today = new Date();
  const youbi = ['日', '月', '火', '水', '木', '金', '土'];
  const dateStr = `${today.getFullYear()}/${String(today.getMonth() + 1).padStart(2, '0')}/${String(today.getDate()).padStart(2, '0')}（${youbi[today.getDay()]}）`;
  const isLogin = location.pathname === '/login';
  return (
    <header className="header">
      <div className="w-6"></div>
      <div className="brand-name">
        {isLogin ? 'Task focus' : dateStr}
      </div>
      <div className="profile-icon"></div>
    </header>
  );
};

export default Header; 