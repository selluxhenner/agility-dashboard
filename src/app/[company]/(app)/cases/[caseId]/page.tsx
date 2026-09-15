// One case, seen from three sides. History timeline from the event log.
export default async function CaseDetailPage({ params }: { params: Promise<{ caseId: string }> }) {
  const { caseId } = await params;
  return (
    <>
      <h1>Case {caseId}</h1>
      <p className="nh-hint">Timeline of events for this case (Phase 3).</p>
    </>
  );
}
