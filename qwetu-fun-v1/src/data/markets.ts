export type Market = {
    id: string;
    question: string;
    category: string;
    color: string;
    poolAmount: number;
    endTime: string;
    participantCount: number;
};

export const markets: Market[] = [
    {
        id: "1",
        question: "Will the mess food run out by 7PM?",
        category: "Campus Life",
        color: "bg-orange-500",
        poolAmount: 12500,
        endTime: new Date(Date.now() + 1000 * 60 * 45).toISOString(), // 45 mins left
        participantCount: 45,
    },
    {
        id: "2",
        question: "Will Prof. Omondi release results this week?",
        category: "Academics",
        color: "bg-blue-500",
        poolAmount: 45000,
        endTime: new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString(), // 1 day
        participantCount: 120,
    },
    {
        id: "3",
        question: "Will the library Wi-Fi survive finals week?",
        category: "Infrastructure",
        color: "bg-purple-500",
        poolAmount: 8000,
        endTime: new Date(Date.now() + 1000 * 60 * 60 * 5).toISOString(), // 5 hours
        participantCount: 28,
    },
    {
        id: "4",
        question: "Will 'Comrade' returning the blue pen happen?",
        category: "Trust Issues",
        color: "bg-rose-500",
        poolAmount: 2500,
        endTime: new Date(Date.now() + 1000 * 60 * 30).toISOString(), // 30 mins
        participantCount: 15,
    },
    {
        id: "5",
        question: "Will the freshers get lost finding 'Building H'?",
        category: "Traditions",
        color: "bg-teal-500",
        poolAmount: 18000,
        endTime: new Date(Date.now() + 1000 * 60 * 60 * 48).toISOString(), // 2 days
        participantCount: 92,
    },
];
