import { Shell } from "@/components/Shell";

export default function Layout({ children }: { children: React.ReactNode }) {
  return <Shell role="ADMIN">{children}</Shell>;
}
