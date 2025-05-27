import React from 'react';

interface FocusViewSectionProps {
  icon?: React.ReactNode;
  label: React.ReactNode;
  children: React.ReactNode;
  visible?: boolean;
  classNameLabel?: string;
  classNameList?: string;
}

const FocusViewSection: React.FC<FocusViewSectionProps> = ({
  icon,
  label,
  children,
  visible = true,
  classNameLabel = 'flex items-center gap-2',
  classNameList = 'mb-10',
}) => {
  if (!visible) return null;
  return (
    <>
      <div className={classNameLabel}>
        {icon}
        {label}
      </div>
      <div className={classNameList}>
        {children}
      </div>
    </>
  );
};

export default FocusViewSection; 