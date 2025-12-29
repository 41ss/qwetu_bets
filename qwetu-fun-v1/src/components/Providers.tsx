"use client";

import dynamic from "next/dynamic";
import { ReactNode } from "react";

const AuthProvider = dynamic(
    () => import("@/contexts/AuthProvider").then((mod) => mod.AuthProvider),
    { ssr: false }
);

export function Providers({ children }: { children: ReactNode }) {
    return <AuthProvider>{children}</AuthProvider>;
}
