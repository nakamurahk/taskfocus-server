import React from 'react';
import { Link, useLocation } from 'react-router-dom';

type TabType = 'tasks' | 'today' | 'analyze' | 'settings';

interface FooterProps {
  activeTab?: TabType;
}

const Footer: React.FC<FooterProps> = ({ activeTab }) => {
  const location = useLocation();
  const currentTab = activeTab || location.pathname.split('/')[1] as TabType || 'tasks';

  return (
    <footer className="footer">
      <div className="bottom-nav">
        <Link to="/tasks" className={`nav-item ${currentTab === 'tasks' ? 'nav-item-active' : ''}`}>
          <span className="nav-icon">📋</span>
          <span className="nav-label">タスク一覧</span>
        </Link>
        <Link to="/today" className={`nav-item ${currentTab === 'today' ? 'nav-item-active' : ''}`}>
          <span className="nav-icon">☀️</span>
          <span className="nav-label">今日のタスク</span>
        </Link>
        <Link to="/analyze" className={`nav-item ${currentTab === 'analyze' ? 'nav-item-active' : ''}`}>
          <span className="nav-icon">📊</span>
          <span className="nav-label">分析</span>
        </Link>
        <Link to="/settings" className={`nav-item ${currentTab === 'settings' ? 'nav-item-active' : ''}`}>
          <span className="nav-icon">⚙️</span>
          <span className="nav-label">設定</span>
        </Link>
      </div>
    </footer>
  );
};

export default Footer; 