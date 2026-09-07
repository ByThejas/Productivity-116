import { Outlet } from "react-router-dom";
import TopNavigation from "./TopNavigation";

function AppShell() {
  return (
    <div className="app-shell">
      <div className="ambient ambient-one" />
      <div className="ambient ambient-two" />

      <div className="app-container">
        <TopNavigation />

        <main className="main-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default AppShell;