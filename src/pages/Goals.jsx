import PageContainer from "../components/layout/PageContainer";
import GlassCard from "../components/ui/GlassCard";

function Goals() {
  return (
    <PageContainer>
      <div className="simple-page">
        <span className="eyebrow">Goals</span>

        <h1>Keep moving forward.</h1>

        <p>
          Your long-term goals and milestones will live here.
        </p>

        <GlassCard className="coming-card">
          <span>Phase 6</span>
          <strong>Goals, milestones and progress</strong>
        </GlassCard>
      </div>
    </PageContainer>
  );
}

export default Goals;