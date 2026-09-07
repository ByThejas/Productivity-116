import PageContainer from "../components/layout/PageContainer";
import GlassCard from "../components/ui/GlassCard";

function Planner() {
  return (
    <PageContainer>
      <div className="simple-page">
        <span className="eyebrow">Planner</span>

        <h1>Plan your days.</h1>

        <p>
          Your daily planning system will be built here.
        </p>

        <GlassCard className="coming-card">
          <span>Phase 4</span>
          <strong>Daily planning, tasks and timeline</strong>
        </GlassCard>
      </div>
    </PageContainer>
  );
}

export default Planner;