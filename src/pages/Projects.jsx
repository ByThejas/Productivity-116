import PageContainer from "../components/layout/PageContainer";
import GlassCard from "../components/ui/GlassCard";

function Projects() {
  return (
    <PageContainer>
      <div className="simple-page">
        <span className="eyebrow">Projects</span>

        <h1>Build something meaningful.</h1>

        <p>
          Your projects and project progress will live here.
        </p>

        <GlassCard className="coming-card">
          <span>Phase 6</span>
          <strong>Projects and project tracking</strong>
        </GlassCard>
      </div>
    </PageContainer>
  );
}

export default Projects;