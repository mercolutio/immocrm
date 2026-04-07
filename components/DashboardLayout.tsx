import Sidebar from "./Sidebar";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      display: "flex",
      width: "100%",
      height: "100vh",
      overflow: "hidden",
      background: "var(--bg)",
      fontFamily: "var(--font-dm-sans, 'DM Sans'), sans-serif",
    }}>
      <Sidebar />
      <main className="main">
        {children}
      </main>
    </div>
  );
}
