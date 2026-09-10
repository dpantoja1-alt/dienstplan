export default function PrintLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="mx-auto max-w-3xl bg-white p-6 text-slate-900 print:p-0">
      {children}
    </div>
  );
}
