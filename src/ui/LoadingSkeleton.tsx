/**
 * Estado de carregamento: ocupa o mesmo lugar do conteúdo que vai chegar, para
 * a tela não mostrar vazio nem saltar quando os dados aparecem.
 */
export function LoadingSkeleton({ lines = [92, 78, 85, 64, 88] }: { lines?: number[] }) {
  return (
    <div className="skeleton" data-testid="estado-loading" aria-label="Carregando" aria-busy="true">
      {lines.map((width, index) => (
        <div className="linha-sk" key={index} style={{ width: `${width}%` }} />
      ))}
    </div>
  );
}
