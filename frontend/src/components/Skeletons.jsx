import React from 'react';

export const DashboardSkeleton = () => (
    <div className="space-y-10 overflow-hidden">
        {/* Header Skeleton */}
        <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl shimmer"></div>
                <div className="space-y-3">
                    <div className="h-2 w-20 shimmer rounded-full"></div>
                    <div className="h-3 w-32 shimmer rounded-full"></div>
                </div>
            </div>
            <div className="w-12 h-12 rounded-full shimmer"></div>
        </div>

        {/* Balance Card Skeleton */}
        <div className="h-56 rounded-[32px] shimmer border border-white/5"></div>

        {/* Quick Actions Skeleton */}
        <div className="grid grid-cols-3 gap-4">
            {[1, 2, 3].map(i => (
                <div key={i} className="h-28 rounded-3xl shimmer border border-white/5"></div>
            ))}
        </div>

        {/* Recent Transactions Skeleton */}
        <div className="space-y-4">
            <div className="h-3 w-40 shimmer rounded-full mb-8"></div>
            {[1, 2, 3, 4].map(i => (
                <div key={i} className="flex justify-between items-center p-5 rounded-3xl shimmer h-24 border border-white/5"></div>
            ))}
        </div>
    </div>
);

export const TransactionSkeleton = () => (
    <div className="space-y-4 overflow-hidden">
        {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="flex justify-between items-center p-5 rounded-3xl shimmer h-24 border border-white/5"></div>
        ))}
    </div>
);
