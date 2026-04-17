import "@/App.css";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import LandingPage from "@/components/LandingPage";
import Dashboard from "@/components/Dashboard";
import AuthCallback from "@/components/AuthCallback";
import AdminDashboard from "@/components/AdminDashboard";

function AppRouter() {
  const location = useLocation();
  if (location.hash?.includes('session_id=')) return <AuthCallback />;
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/market" element={<Dashboard />} />
      <Route path="/admin" element={<AdminDashboard />} />
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AppRouter />
    </BrowserRouter>
  );
}

export default App;
