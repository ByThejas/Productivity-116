import { Navigate, Route, Routes } from "react-router-dom";

import AppShell from "./components/layout/AppShell";

import Overview from "./pages/Overview";
import Planner from "./pages/Planner";
import Projects from "./pages/Projects";
import Goals from "./pages/Goals";

function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route path="/" element={<Overview />} />
        <Route path="/planner" element={<Planner />} />
        <Route path="/projects" element={<Projects />} />
        <Route path="/goals" element={<Goals />} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}

export default App;