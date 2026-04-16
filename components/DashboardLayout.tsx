import Sidebar from "./Sidebar";
import NotificationBell from "./NotificationBell";
import "../app/dashboard.css";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="dashboard-layout">
      <Sidebar />
      <main className="main">
        <div style={{ position: "fixed", top: 18, right: 24, zIndex: 50 }}>
          <NotificationBell />
        </div>
        {children}
      </main>
    </div>
  );
}
