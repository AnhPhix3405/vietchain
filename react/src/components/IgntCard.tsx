import React from 'react';

interface IgntCardProps {
  children: React.ReactNode;
  className?: string;
}

const IgntCard: React.FC<IgntCardProps> = ({ children, className = '' }) => {
  return (
    <div className={`ignt-card ${className}`}>
      {children}
    </div>
  );
};

export default IgntCard;