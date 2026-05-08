interface SkeletonLoaderProps {
  height?: number | string;
  width?: number | string;
  card?: boolean;
  className?: string;
}

export function SkeletonLoader({
  height = 20,
  width = '100%',
  card = false,
  className = '',
}: SkeletonLoaderProps) {
  const classes = ['skeleton', card ? 'skeleton-card' : '', className]
    .filter(Boolean)
    .join(' ');

  return (
    <div
      className={classes}
      style={{
        height: typeof height === 'number' ? `${height}px` : height,
        width: typeof width === 'number' ? `${width}px` : width,
      }}
      aria-label="Loading content"
      aria-busy="true"
      role="status"
    />
  );
}
