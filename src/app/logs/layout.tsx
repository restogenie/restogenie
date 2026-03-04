import ClientAuthLayout from "@/components/ClientAuthLayout";

export default function LogsLayout({ children }: { children: React.ReactNode }) {
    return <ClientAuthLayout>{children}</ClientAuthLayout>;
}
