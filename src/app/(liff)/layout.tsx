export default function LiffLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen" style={{ background: "linear-gradient(160deg, #F8FAFC 0%, #EFF6FF 40%, #F0FDFA 100%)" }}>
      {children}
    </div>
  );
}
