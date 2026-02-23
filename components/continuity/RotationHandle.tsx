import React from 'react';

interface RotationHandleProps {
    angle: number;
    color: string;
    radius?: number;
    onRotateStart: (e: React.MouseEvent) => void;
}

const RotationHandle: React.FC<RotationHandleProps> = ({ angle, color, radius = 28, onRotateStart }) => {
    const angleRad = ((angle - 90) * Math.PI) / 180;
    const dotX = radius * Math.cos(angleRad);
    const dotY = radius * Math.sin(angleRad);

    return (
        <svg
            className="absolute overflow-visible pointer-events-none"
            style={{ left: '50%', top: '50%', transform: 'translate(-50%, -50%)' }}
            width={radius * 2 + 20}
            height={radius * 2 + 20}
            viewBox={`${-(radius + 10)} ${-(radius + 10)} ${(radius + 10) * 2} ${(radius + 10) * 2}`}
        >
            <circle
                cx={0} cy={0} r={radius}
                fill="none" stroke="white" strokeWidth="1" opacity="0.2"
                strokeDasharray="4 3"
            />
            <circle
                cx={dotX} cy={dotY} r={7}
                fill={color} stroke="white" strokeWidth="1.5"
                opacity={0.9}
                className="pointer-events-auto cursor-grab"
                onMouseDown={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    onRotateStart(e);
                }}
            />
            <line
                x1={0} y1={0} x2={dotX} y2={dotY}
                stroke={color} strokeWidth="1.5" opacity="0.4"
                strokeLinecap="round"
            />
        </svg>
    );
};

export default RotationHandle;
