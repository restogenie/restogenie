"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";

export interface Store {
    id: number;
    name: string;
    business_number: string;
    auth_code_1?: string | null;
}

interface StoreContextType {
    stores: Store[];
    currentStore: Store | null;
    isLoading: boolean;
    setCurrentStore: (store: Store) => void;
    refreshStores: () => Promise<void>;
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);

export function StoreProvider({ children }: { children: ReactNode }) {
    const [stores, setStores] = useState<Store[]>([]);
    const [currentStore, setCurrentStoreState] = useState<Store | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const fetchStores = async () => {
        setIsLoading(true);
        try {
            const res = await fetch("/api/v1/business/stores", {
                headers: {
                    // Token is handled by fetch automatically if attached, or Next.js API reads from cookies
                }
            });
            if (res.ok) {
                const data = await res.json();
                setStores(data.stores);

                // Read from LocalStorage or pick first
                const savedId = localStorage.getItem("restogenie_current_store_id");
                if (savedId && data.stores.find((s: Store) => s.id.toString() === savedId)) {
                    setCurrentStoreState(data.stores.find((s: Store) => s.id.toString() === savedId) || null);
                } else if (data.stores.length > 0) {
                    setCurrentStoreState(data.stores[0]);
                }
            }
        } catch (error) {
            console.error("Failed to load stores", error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchStores();
    }, []);

    const setCurrentStore = (store: Store) => {
        setCurrentStoreState(store);
        localStorage.setItem("restogenie_current_store_id", store.id.toString());
        // Custom event for immediate sync components to catch if needed
        window.dispatchEvent(new Event("storeChanged"));
    };

    return (
        <StoreContext.Provider value={{ stores, currentStore, isLoading, setCurrentStore, refreshStores: fetchStores }}>
            {children}
        </StoreContext.Provider>
    );
}

export function useStore() {
    const context = useContext(StoreContext);
    if (context === undefined) {
        throw new Error("useStore must be used within a StoreProvider");
    }
    return context;
}
