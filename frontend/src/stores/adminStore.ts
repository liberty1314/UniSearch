import { create } from 'zustand';

interface AdminStore {
    isMobileSidebarOpen: boolean;
    toggleMobileSidebar: () => void;
    setMobileSidebarOpen: (open: boolean) => void;
}

export const useAdminStore = create<AdminStore>((set) => ({
    isMobileSidebarOpen: false,
    toggleMobileSidebar: () => set((state) => ({ isMobileSidebarOpen: !state.isMobileSidebarOpen })),
    setMobileSidebarOpen: (open) => set({ isMobileSidebarOpen: open }),
}));
