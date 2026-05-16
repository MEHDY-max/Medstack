import { Routes, Route } from "react-router-dom";

import Login from "./pages/Login";
import Register from "./pages/Register";
import Home from "./pages/Home";
import QuestionDetail from "./pages/QuestionDetail";
import Profile from "./pages/profile";
import ModeratorDashboard from "./pages/ModeratorDashboard";
import AdminStats from "./pages/AdminStats";
import MedicalDisclaimer from "./components/MedicalDisclaimer";

function App() {
  return (
    <>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/question/:id" element={<QuestionDetail />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/moderation" element={<ModeratorDashboard />} />
        <Route path="/stats" element={<AdminStats />} />
      </Routes>

      <MedicalDisclaimer />
    </>
  );
}

export default App;