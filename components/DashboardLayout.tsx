import Sidebar from "./Sidebar";
import "../app/dashboard.css";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="dashboard-layout">
      <Sidebar />
      <main className="main">
        {children}
      </main>
    </div>
  );
}
