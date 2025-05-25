import React from 'react';
import TaskAnalytics from '../../components/TaskAnalytics';
import Footer from '../../components/Footer';

const Analyze: React.FC = () => {
  return (
    <div className="w-full px-6 py-6">
      <TaskAnalytics />
      <Footer />
    </div>
  );
};

export default Analyze; 