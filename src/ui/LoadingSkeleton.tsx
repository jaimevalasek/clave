/**
 * Loading state: takes the place of the content that is coming, so the screen
 * neither shows an empty page nor jumps when the data arrives.
 */
export function LoadingSkeleton({ lines = [92, 78, 85, 64, 88] }: { lines?: number[] }) {
  return (
    <div className="skeleton" data-testid="loading-skeleton" aria-label="Carregando" aria-busy="true">
      {lines.map((width, index) => (
        <div className="skeleton-line" key={index} style={{ width: `${width}%` }} />
      ))}
    </div>
  );
}
