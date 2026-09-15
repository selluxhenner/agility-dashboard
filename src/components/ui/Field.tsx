// Label + input + optional hint. Uses the global nh-field primitives from globals.css.
type Props = {
  id: string;
  label: React.ReactNode;
  hint?: React.ReactNode;
  labelRight?: React.ReactNode;
  children: React.ReactNode;
};

export function Field({ id, label, hint, labelRight, children }: Props) {
  return (
    <div className="nh-field">
      {labelRight ? (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <label className="nh-label" htmlFor={id}>{label}</label>
          {labelRight}
        </div>
      ) : (
        <label className="nh-label" htmlFor={id}>{label}</label>
      )}
      {children}
      {hint && <p className="nh-hint">{hint}</p>}
    </div>
  );
}
