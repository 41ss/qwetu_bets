export default function SkeletonCard() {
    return (
        <div className="w-[340px] h-[500px] bg-gray-900 rounded-3xl shadow-2xl flex flex-col justify-between p-6 border-4 border-gray-800 animate-pulse relative">
            {/* Timer Badge Skeleton */}
            <div className="absolute top-6 left-6 w-24 h-6 bg-gray-800 rounded-full" />

            {/* Content Skeleton */}
            <div className="mt-8 flex justify-between">
                <div className="w-20 h-6 bg-gray-800 rounded-full" />
                <div className="w-8 h-8 bg-gray-800 rounded-full" />
            </div>

            <div className="mt-4 mb-auto space-y-3">
                <div className="w-full h-8 bg-gray-800 rounded-lg" />
                <div className="w-3/4 h-8 bg-gray-800 rounded-lg" />
                <div className="w-1/2 h-8 bg-gray-800 rounded-lg" />
            </div>

            {/* Pool Badge Skeleton */}
            <div className="absolute bottom-24 left-1/2 -translate-x-1/2 w-48 h-10 bg-gray-800 rounded-full" />

            {/* Footer Skeleton */}
            <div className="flex justify-between items-end mt-4">
                <div className="space-y-2">
                    <div className="w-32 h-4 bg-gray-800 rounded" />
                    <div className="w-24 h-2 bg-gray-800 rounded-full" />
                </div>
                <div className="w-8 h-8 bg-gray-800 rounded-full" />
            </div>
        </div>
    );
}
