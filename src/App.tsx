import { useEffect } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import AppShell from "./components/AppShell";
import Landing from "./pages/Landing";
import Inbox from "./pages/app/Inbox";
import Mentor from "./pages/app/Mentor";
import Models from "./pages/app/Models";
import NewProject from "./pages/app/NewProject";
import Overview from "./pages/app/Overview";
import Profile from "./pages/app/Profile";
import Programs from "./pages/app/Programs";
import ReportPage from "./pages/app/Report";
import Scan from "./pages/app/Scan";

function ScrollTop() {
  const { pathname, hash } = useLocation();
  useEffect(() => {
    if (!hash) window.scrollTo(0, 0);
  }, [pathname, hash]);
  return null;
}

export default function App() {
  return (
    <>
      <ScrollTop />
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/app" element={<AppShell />}>
          <Route index element={<Overview />} />
          <Route path="programs" element={<Programs />} />
          <Route path="programs/:id" element={<Programs />} />
          <Route path="new" element={<NewProject />} />
          <Route path="scan" element={<Scan />} />
          <Route path="inbox" element={<Inbox />} />
          <Route path="report" element={<ReportPage />} />
          <Route path="profile" element={<Profile />} />
          <Route path="mentor" element={<Mentor />} />
          <Route path="ai" element={<Models />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}
