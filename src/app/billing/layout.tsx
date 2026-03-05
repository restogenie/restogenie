import ClientAuthLayout from "@/components/ClientAuthLayout";

export default function BillingLayout({ children }: { children: React.ReactNode }) {
    return <ClientAuthLayout>{children}</ClientAuthLayout>;
}
