import React from 'react';
import type { SetElementType } from '../../types';

const svgProps = {
    viewBox: '0 0 20 20' as const,
    fill: 'none' as const,
    stroke: 'currentColor' as const,
    strokeWidth: 1.5,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
};

const SetElementTypeIcon: React.FC<{ type: SetElementType; className?: string }> = ({
    type,
    className = 'w-5 h-5',
}) => {
    const Svg = (props: React.SVGProps<SVGSVGElement>) => (
        <svg className={className} {...svgProps} style={{ pointerEvents: 'none' }} {...props} />
    );

    switch (type) {
        // Furniture
        case 'table':
            return (
                <Svg>
                    <rect x={4} y={6} width={12} height={10} rx={1.5} />
                    <line x1={10} y1={6} x2={10} y2={16} />
                </Svg>
            );
        case 'round_table':
            return (
                <Svg>
                    <circle cx={10} cy={10} r={6} />
                </Svg>
            );
        case 'oval_table':
            return (
                <Svg>
                    <ellipse cx={10} cy={10} rx={7} ry={4} />
                </Svg>
            );
        case 'chair':
            return (
                <Svg>
                    <rect x={5} y={8} width={10} height={7} rx={1} />
                    <line x1={5} y1={8} x2={5} y2={4} />
                    <line x1={15} y1={8} x2={15} y2={4} />
                </Svg>
            );
        case 'sofa':
            return (
                <Svg>
                    <rect x={2} y={12} width={16} height={4} rx={1} />
                    <path d="M4 12v-2.5a1.5 1.5 0 011.5-1.5h9a1.5 1.5 0 011.5 1.5V12" />
                </Svg>
            );
        case 'bed':
            return (
                <Svg>
                    <rect x={2.5} y={8} width={15} height={6} rx={1} />
                    <path d="M2.5 8v-2a1 1 0 011-1h13a1 1 0 011 1v2" />
                    <line x1={2.5} y1={14} x2={2.5} y2={17} />
                    <line x1={17.5} y1={14} x2={17.5} y2={17} />
                </Svg>
            );
        case 'desk':
            return (
                <Svg>
                    <rect x={2.5} y={7} width={15} height={2.5} rx={0.5} />
                    <line x1={4} y1={9.5} x2={4} y2={16} />
                    <line x1={16} y1={9.5} x2={16} y2={16} />
                    <rect x={11} y={9.5} width={4} height={3.5} rx={0.5} />
                </Svg>
            );
        case 'monitor':
            return (
                <Svg>
                    <rect x={3} y={3} width={14} height={10} rx={1} />
                    <line x1={6} y1={13} x2={14} y2={13} />
                    <line x1={10} y1={13} x2={10} y2={16} />
                </Svg>
            );
        case 'laptop':
            return (
                <Svg>
                    <rect x={2} y={4} width={16} height={9} rx={0.5} />
                    <path d="M2 13h16v2a1 1 0 01-1 1H3a1 1 0 01-1-1v-2z" />
                </Svg>
            );
        case 'keyboard':
            return (
                <Svg>
                    <rect x={2} y={8} width={16} height={5} rx={0.5} />
                    <line x1={5} y1={9.5} x2={5} y2={11.5} />
                    <line x1={8} y1={9.5} x2={8} y2={11.5} />
                    <line x1={11} y1={9.5} x2={11} y2={11.5} />
                    <line x1={14} y1={9.5} x2={14} y2={11.5} />
                    <line x1={17} y1={9.5} x2={17} y2={11.5} />
                </Svg>
            );
        case 'bottle':
            return (
                <Svg>
                    <path d="M8 3h4v2H8z M7 5h6l1 11H6z" />
                    <line x1={10} y1={5} x2={10} y2={16} />
                </Svg>
            );
        case 'cell_phone':
            return (
                <Svg>
                    <rect x={5} y={2} width={10} height={16} rx={1.5} />
                    <circle cx={10} cy={15} r={0.8} />
                </Svg>
            );
        case 'paper':
            return (
                <Svg>
                    <path d="M5 2h8l4 4v12H5V2z" />
                    <path d="M13 2v4h4" />
                </Svg>
            );
        case 'plate':
            return (
                <Svg>
                    <circle cx={10} cy={10} r={5} />
                    <circle cx={10} cy={10} r={3.5} />
                </Svg>
            );

        // Doors & Windows
        case 'door_open':
            return (
                <Svg>
                    <line x1={4} y1={18} x2={4} y2={2} />
                    <path d="M4 2 A14 14 0 0 1 18 18" />
                </Svg>
            );
        case 'door_closed':
            return (
                <Svg>
                    <line x1={4} y1={2} x2={4} y2={18} />
                    <line x1={4} y1={2} x2={18} y2={2} />
                </Svg>
            );
        case 'double_door_open':
            return (
                <Svg>
                    <path d="M4 18 A8 8 0 0 1 10 10" />
                    <path d="M16 18 A8 8 0 0 0 10 10" />
                </Svg>
            );
        case 'double_door_closed':
            return (
                <Svg>
                    <path d="M4 18 L10 10 L16 18" />
                </Svg>
            );
        case 'window':
            return (
                <Svg>
                    <rect x={3} y={4} width={14} height={12} rx={0.5} />
                    <line x1={10} y1={4} x2={10} y2={16} />
                    <line x1={3} y1={10} x2={17} y2={10} />
                </Svg>
            );
        case 'medium_opening':
            return (
                <Svg>
                    <line x1={4} y1={6} x2={4} y2={14} />
                    <line x1={16} y1={6} x2={16} y2={14} />
                </Svg>
            );
        case 'big_opening':
            return (
                <Svg>
                    <line x1={2} y1={5} x2={2} y2={15} />
                    <line x1={18} y1={5} x2={18} y2={15} />
                </Svg>
            );
        case 'small_opening':
            return (
                <Svg>
                    <line x1={7} y1={7} x2={7} y2={13} />
                    <line x1={13} y1={7} x2={13} y2={13} />
                </Svg>
            );
        case 'prison_bars':
            return (
                <Svg>
                    <line x1={2} y1={10} x2={18} y2={10} />
                    {[5, 8, 11, 14].map((x) => (
                        <line key={x} x1={x} y1={6} x2={x} y2={14} />
                    ))}
                </Svg>
            );

        // Set Pieces
        case 'wall_segment':
            return (
                <Svg>
                    <rect x={3} y={4} width={14} height={12} rx={0.5} />
                </Svg>
            );
        case 'stairs':
            return (
                <Svg>
                    <path d="M3 17h3v-3h3V8h3V5h3" />
                </Svg>
            );
        case 'tree':
            return (
                <Svg>
                    <path d="M10 2.5L4 12h12L10 2.5z" />
                    <line x1={10} y1={12} x2={10} y2={17} />
                </Svg>
            );
        case 'bush':
            return (
                <Svg>
                    <circle cx={10} cy={10} r={5} />
                </Svg>
            );

        // Vehicles (simplified top-down outlines)
        case 'car':
            return (
                <Svg>
                    <path d="M4 14h12M4 14a2 2 0 01-2-2V9l1.5-3h9L17 9v3a2 2 0 01-2 2M4 14a1.5 1.5 0 100-3 1.5 1.5 0 000 3zm12 0a1.5 1.5 0 100-3 1.5 1.5 0 000 3z" />
                </Svg>
            );
        case 'minibus':
            return (
                <Svg>
                    <rect x={2} y={7} width={16} height={7} rx={1} />
                    <path d="M2 10h2M16 10h2" />
                    <circle cx={6} cy={15} r={1.2} />
                    <circle cx={14} cy={15} r={1.2} />
                </Svg>
            );
        case 'motorcycle':
            return (
                <Svg>
                    <circle cx={5} cy={14} r={2.5} />
                    <circle cx={15} cy={14} r={2.5} />
                    <path d="M7.5 14h5l2-6H8" />
                </Svg>
            );
        case 'semi_truck':
            return (
                <Svg>
                    <rect x={2} y={6} width={8} height={8} rx={0.5} />
                    <path d="M10 10h6l2 4v2h-4" />
                    <circle cx={5} cy={16} r={1.5} />
                    <circle cx={14} cy={16} r={1.5} />
                </Svg>
            );
        case 'truck_trailer':
            return (
                <Svg>
                    <rect x={2} y={6} width={14} height={8} rx={0.5} />
                    <circle cx={5} cy={16} r={1.5} />
                    <circle cx={13} cy={16} r={1.5} />
                </Svg>
            );
        case 'tank':
            return (
                <Svg>
                    <rect x={3} y={8} width={14} height={6} rx={0.5} />
                    <path d="M4 8v-2h2M16 8v-2h-2" />
                    <line x1={10} y1={11} x2={16} y2={11} />
                    <circle cx={5} cy={15} r={1.2} />
                    <circle cx={15} cy={15} r={1.2} />
                </Svg>
            );
        case 'commercial_jet':
            return (
                <Svg>
                    <path d="M2 10h4l2-6h4l2 6h4l-6 4v4l-2-2-2 2v-4z" />
                </Svg>
            );
        case 'fighter_jet':
            return (
                <Svg>
                    <path d="M18 10H8L6 4h2l4 6h4L12 10H6L2 12l2-1v2l2-1 2 4 2-2v-4l4 1z" />
                </Svg>
            );
        case 'small_plane':
            return (
                <Svg>
                    <path d="M10 4l6 6-6 2-2 6-2-6-6-2z" />
                </Svg>
            );

        // Equipment
        case 'crane':
            return (
                <Svg>
                    <line x1={10} y1={2} x2={10} y2={14} />
                    <line x1={4} y1={6} x2={16} y2={6} />
                    <line x1={12} y1={6} x2={12} y2={18} />
                    <rect x={10} y={16} width={4} height={2} />
                </Svg>
            );
        case 'boom_microphone':
            return (
                <Svg>
                    <line x1={10} y1={2} x2={10} y2={14} />
                    <circle cx={10} cy={16} r={2} />
                    <line x1={10} y1={12} x2={6} y2={8} />
                </Svg>
            );
        case 'equipment':
            return (
                <Svg>
                    <rect x={4} y={6} width={6} height={8} rx={0.5} />
                    <path d="M12 8l4-2v8l-4-2" />
                </Svg>
            );
        case 'monitor_village':
            return (
                <Svg>
                    <rect x={3} y={4} width={14} height={9} rx={0.5} />
                    <line x1={10} y1={13} x2={10} y2={16} />
                    <rect x={8} y={16} width={4} height={2} rx={0.5} />
                </Svg>
            );

        // Weapons
        case 'gun':
            return (
                <Svg>
                    <path d="M6 14V8h8v2h-4v4M14 10h2" />
                </Svg>
            );
        case 'rifle':
            return (
                <Svg>
                    <line x1={3} y1={10} x2={17} y2={10} />
                    <rect x={14} y={8.5} width={3} height={3} rx={0.3} />
                </Svg>
            );

        // Animals
        case 'dog':
            return (
                <Svg>
                    <ellipse cx={10} cy={12} rx={6} ry={4} />
                    <circle cx={10} cy={8} r={2.5} />
                    <path d="M6 10v2M14 10v2" />
                </Svg>
            );
        case 'horse':
            return (
                <Svg>
                    <ellipse cx={10} cy={11} rx={5} ry={3.5} />
                    <circle cx={10} cy={6} r={2} />
                    <path d="M14 5l1-2M8 8v2M12 8v2" />
                </Svg>
            );

        // Arrows
        case 'straight_arrow':
            return (
                <Svg>
                    <line x1={4} y1={10} x2={14} y2={10} />
                    <path d="M11 7l3 3-3 3" />
                </Svg>
            );
        case 'curved_arrow':
            return (
                <Svg>
                    <path d="M6 14Q12 14 14 8" />
                    <path d="M11 6l3 2-2 3" />
                </Svg>
            );

        // Custom
        case 'custom':
            return (
                <Svg strokeDasharray="2 1.5">
                    <rect x={3} y={3} width={14} height={14} rx={1} />
                </Svg>
            );

        default: {
            // Exhaustiveness guard: if a new SetElementType value is added to the union
            // but not handled above, TypeScript will warn here during development.
            const _exhaustiveCheck: never = type as never;
            void _exhaustiveCheck;
            return (
                <Svg>
                    <rect x={3} y={3} width={14} height={14} rx={1} />
                </Svg>
            );
        }
    }
};

export default SetElementTypeIcon;
