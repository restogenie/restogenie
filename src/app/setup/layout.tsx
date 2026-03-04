import ClientAuthLayout from "@/components/ClientAuthLayout";

export default function SetupLayout({ children }: { children: React.ReactNode }) {
    return <ClientAuthLayout>{children}</ClientAuthLayout>;
}
