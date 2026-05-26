export default function ExamLayout({ children }: { children: React.ReactNode }) {
  // We keep it completely barebones. Root layout handles HTML body.
  return (
    <div className="h-screen w-screen overflow-hidden">
        {children}
    </div>
  );
}
