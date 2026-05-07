import styles from './Skeleton.module.css';

interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  borderRadius?: string;
  className?: string;
}

export default function Skeleton({ width, height, borderRadius, className }: SkeletonProps) {
  return (
    <div 
      data-testid="skeleton-loader"
      className={`${styles.skeleton} ${className || ''}`} 
      style={{ 
        width: width || '100%', 
        height: height || '20px', 
        borderRadius: borderRadius || '8px' 
      }} 
    />
  );
}
