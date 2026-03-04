import ClientAuthLayout from "@/components/ClientAuthLayout";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    return <ClientAuthLayout>{children}</ClientAuthLayout>;
}
