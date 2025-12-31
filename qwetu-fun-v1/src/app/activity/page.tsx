import MyBets from "@/components/MyBets";
import Header from "@/components/Header";
import { Toaster } from "react-hot-toast";

export default function ActivityPage() {
    return (
        <div className="min-h-screen bg-[#0a0a0a] flex flex-col items-center p-4 overflow-hidden relative">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_10%,_var(--tw-gradient-stops))] from-blue-900/40 via-[#0a0a0a] to-[#0a0a0a]" />

            <Header />
            <Toaster position="bottom-center" />

            <main className="relative z-10 w-full flex flex-col items-center mt-24">
                <MyBets />
            </main>
        </div>
    );
}
