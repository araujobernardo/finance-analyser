import { Routes, Route } from "react-router-dom";
import { AccountProvider } from "./context/AccountContext";
import { NavBar } from "./components/NavBar";
import { ChatPanel } from "./components/ChatPanel";
import { DashboardPage } from "./pages/DashboardPage";
import { UploadPage } from "./pages/UploadPage";
import { HistoryPage } from "./pages/HistoryPage";
import { SettingsPage } from "./pages/SettingsPage";
import { NotFoundPage } from "./pages/NotFoundPage";
import "./App.css";

function App() {
  return (
    <AccountProvider>
      <>
        <NavBar />
        <main>
          <Routes>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/upload" element={<UploadPage />} />
            <Route path="/history" element={<HistoryPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </main>
        <ChatPanel />
      </>
    </AccountProvider>
  );
}

export default App;
