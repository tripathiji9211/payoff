import React from 'react';
import { motion } from 'framer-motion';

const SuccessCheckmark = ({ size = 80, color = "#00ff88" }) => {
    return (
        <div className="flex items-center justify-center">
            <svg width={size} height={size} viewBox="0 0 100 100">
                {/* Circle Background */}
                <motion.circle
                    cx="50"
                    cy="50"
                    r="45"
                    stroke={color}
                    strokeWidth="4"
                    fill="transparent"
                    initial={{ pathLength: 0, opacity: 0 }}
                    animate={{ pathLength: 1, opacity: 1 }}
                    transition={{ duration: 0.6, ease: "easeOut" }}
                />
                {/* Checkmark */}
                <motion.path
                    d="M30 50L45 65L70 35"
                    fill="transparent"
                    stroke={color}
                    strokeWidth="6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    initial={{ pathLength: 0, scale: 0.8 }}
                    animate={{ pathLength: 1, scale: 1 }}
                    transition={{ 
                        delay: 0.5, 
                        duration: 0.4, 
                        ease: "easeOut",
                        type: "spring",
                        stiffness: 200
                    }}
                />
            </svg>
        </div>
    );
};

export default SuccessCheckmark;
