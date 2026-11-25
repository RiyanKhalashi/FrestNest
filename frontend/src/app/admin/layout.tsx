import { Shell } from "@/components/layout/Shell";

export default function Layout({ children }: { children: React.ReactNode }) {
  return <Shell role="ADMIN">{children}</Shell>;
}
