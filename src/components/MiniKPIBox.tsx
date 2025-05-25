import React from 'react';

export interface MiniKPIBoxProps {
  label: string;
  value: string;
  icon?: string;
}

const MiniKPIBox: React.FC<MiniKPIBoxProps> = ({ label, value, icon }) => (
  <div className="bg-white rounded-xl shadow-sm border p-3 text-center">
    <div className="flex items-center justify-center gap-1 mb-1">
      {icon && <span className="text-base">{icon}</span>}
      <span className="text-xs text-gray-500">{label}</span>
    </div>
    <div className="text-lg font-bold text-gray-800">{value}</div>
  </div>
);

export default MiniKPIBox; 