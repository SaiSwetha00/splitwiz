import { Navbar } from "@/components/Navbar";

export default function TripLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Navbar />
      <div className="flex flex-1 flex-col">{children}</div>
    </>
  );
}
