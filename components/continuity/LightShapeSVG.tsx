import React from 'react';
import type { LightShape } from '../../constants';

const LightShapeSVG: React.FC<{ shape: LightShape; cx: number; cy: number; r?: number }> = ({ shape, cx, cy, r = 1.5 }) => {
    const F = 'rgba(160,220,100,0.25)';
    const S = 'rgba(160,220,100,0.85)';
    const W = r * 0.06;
    const w = r * 0.04;

    switch (shape) {
        case 'sun': {
            const ir = r * 0.38; const or1 = r * 0.55; const or2 = r * 0.85;
            return <g>
                <circle cx={cx} cy={cy} r={ir} fill={F} stroke={S} strokeWidth={W}/>
                {[0,45,90,135,180,225,270,315].map(a => {
                    const rad = a * Math.PI / 180;
                    return <line key={a} x1={cx + or1 * Math.cos(rad)} y1={cy + or1 * Math.sin(rad)}
                        x2={cx + or2 * Math.cos(rad)} y2={cy + or2 * Math.sin(rad)}
                        stroke={S} strokeWidth={W} strokeLinecap="round"/>;
                })}
            </g>;
        }
        case 'fresnel_sm': {
            const bw = r * 0.5; const bh = r * 0.65;
            return <g>
                <rect x={cx-bw/2} y={cy-bh/2} width={bw} height={bh} rx={r*0.04} fill={F} stroke={S} strokeWidth={W}/>
                <line x1={cx-bw*0.3} y1={cy} x2={cx+bw*0.3} y2={cy} stroke={S} strokeWidth={w}/>
                <line x1={cx} y1={cy-bh/2} x2={cx} y2={cy-bh/2-r*0.2} stroke={S} strokeWidth={w}/>
            </g>;
        }
        case 'fresnel_md': {
            const bw = r * 0.7; const bh = r * 0.85;
            return <g>
                <rect x={cx-bw/2} y={cy-bh/2} width={bw} height={bh} rx={r*0.04} fill={F} stroke={S} strokeWidth={W}/>
                <line x1={cx-bw*0.35} y1={cy-bh*0.15} x2={cx+bw*0.35} y2={cy-bh*0.15} stroke={S} strokeWidth={w}/>
                <line x1={cx-bw*0.35} y1={cy+bh*0.15} x2={cx+bw*0.35} y2={cy+bh*0.15} stroke={S} strokeWidth={w}/>
                <line x1={cx} y1={cy-bh/2} x2={cx} y2={cy-bh/2-r*0.25} stroke={S} strokeWidth={w}/>
                <line x1={cx-r*0.12} y1={cy-bh/2-r*0.25} x2={cx+r*0.12} y2={cy-bh/2-r*0.25} stroke={S} strokeWidth={w}/>
            </g>;
        }
        case 'fresnel_lg': {
            const bw = r * 0.9; const bh = r * 1.1;
            return <g>
                <rect x={cx-bw/2} y={cy-bh/2+r*0.1} width={bw} height={bh} rx={r*0.05} fill={F} stroke={S} strokeWidth={W}/>
                {[-0.25, 0, 0.25].map((off,i)=><line key={i} x1={cx-bw*0.38} y1={cy+bh*off+r*0.1} x2={cx+bw*0.38} y2={cy+bh*off+r*0.1} stroke={S} strokeWidth={w}/>)}
                <line x1={cx} y1={cy-bh/2+r*0.1} x2={cx} y2={cy-bh/2-r*0.2} stroke={S} strokeWidth={w}/>
                <line x1={cx-r*0.2} y1={cy-bh/2-r*0.2} x2={cx+r*0.2} y2={cy-bh/2-r*0.2} stroke={S} strokeWidth={w}/>
                <line x1={cx-bw/2} y1={cy+bh/2+r*0.1} x2={cx-bw/2-r*0.15} y2={cy+bh/2+r*0.25} stroke={S} strokeWidth={w}/>
                <line x1={cx+bw/2} y1={cy+bh/2+r*0.1} x2={cx+bw/2+r*0.15} y2={cy+bh/2+r*0.25} stroke={S} strokeWidth={w}/>
            </g>;
        }
        case 'flo_4': {
            const bw = r * 1.2; const bh = r * 0.8;
            return <g>
                <rect x={cx-bw/2} y={cy-bh/2} width={bw} height={bh} rx={r*0.04} fill={F} stroke={S} strokeWidth={W}/>
                {[-0.3,-0.1,0.1,0.3].map((off,i)=><line key={i} x1={cx-bw*0.4} y1={cy+bh*off} x2={cx+bw*0.4} y2={cy+bh*off} stroke={S} strokeWidth={w}/>)}
            </g>;
        }
        case 'flo_2': {
            const bw = r * 1.2; const bh = r * 0.5;
            return <g>
                <rect x={cx-bw/2} y={cy-bh/2} width={bw} height={bh} rx={r*0.04} fill={F} stroke={S} strokeWidth={W}/>
                {[-0.2,0.2].map((off,i)=><line key={i} x1={cx-bw*0.4} y1={cy+bh*off} x2={cx+bw*0.4} y2={cy+bh*off} stroke={S} strokeWidth={w}/>)}
            </g>;
        }
        case 'flo_1': {
            const bw = r * 1.3;
            return <g>
                <line x1={cx-bw/2} y1={cy} x2={cx+bw/2} y2={cy} stroke={S} strokeWidth={W*2} strokeLinecap="round"/>
            </g>;
        }
        case 'panel': {
            const bw = r * 1.3; const bh = r * 0.55;
            return <g>
                <rect x={cx-bw/2} y={cy-bh/2} width={bw} height={bh} rx={r*0.06} fill={F} stroke={S} strokeWidth={W}/>
            </g>;
        }
        case 'led': {
            const sz = r * 0.65;
            return <g>
                <rect x={cx-sz/2} y={cy-sz/2} width={sz} height={sz} rx={r*0.08} fill={F} stroke={S} strokeWidth={W}/>
            </g>;
        }
        case 'led_1x1': {
            const sz = r * 0.9;
            return <g>
                <rect x={cx-sz/2} y={cy-sz/2} width={sz} height={sz} rx={r*0.04} fill={F} stroke={S} strokeWidth={W}/>
                <line x1={cx} y1={cy-sz/2} x2={cx} y2={cy+sz/2} stroke={S} strokeWidth={w}/>
                <line x1={cx-sz/2} y1={cy} x2={cx+sz/2} y2={cy} stroke={S} strokeWidth={w}/>
            </g>;
        }
        case 'open_face': {
            const sz = r * 0.85;
            return <g>
                <rect x={cx-sz/2} y={cy-sz/2} width={sz} height={sz} rx={r*0.04} fill={F} stroke={S} strokeWidth={W}/>
                <rect x={cx-sz*0.35} y={cy-sz*0.35} width={sz*0.7} height={sz*0.7} rx={r*0.03} fill="none" stroke={S} strokeWidth={w}/>
            </g>;
        }
        case 'ellipsoidal': {
            const tw = r * 0.4; const bw2 = r * 0.65; const h = r * 1.0;
            return <g>
                <path d={`M${cx-tw/2} ${cy-h/2} L${cx+tw/2} ${cy-h/2} L${cx+bw2/2} ${cy+h/2} L${cx-bw2/2} ${cy+h/2} Z`} fill={F} stroke={S} strokeWidth={W}/>
                <line x1={cx-tw/2} y1={cy-h*0.05} x2={cx-tw/2-r*0.15} y2={cy-h*0.05} stroke={S} strokeWidth={w}/>
                <line x1={cx+tw/2} y1={cy-h*0.05} x2={cx+tw/2+r*0.15} y2={cy-h*0.05} stroke={S} strokeWidth={w}/>
            </g>;
        }
        case 'par': {
            return <g>
                <circle cx={cx} cy={cy} r={r*0.55} fill={F} stroke={S} strokeWidth={W}/>
                <circle cx={cx} cy={cy} r={r*0.32} fill="none" stroke={S} strokeWidth={w}/>
            </g>;
        }
        case 'scoop': {
            return <g>
                <path d={`M${cx-r*0.55} ${cy-r*0.35} Q${cx} ${cy+r*0.7} ${cx+r*0.55} ${cy-r*0.35}`} fill={F} stroke={S} strokeWidth={W}/>
                <line x1={cx-r*0.55} y1={cy-r*0.35} x2={cx+r*0.55} y2={cy-r*0.35} stroke={S} strokeWidth={w}/>
            </g>;
        }
        case 'cyc': {
            return <g>
                <path d={`M${cx-r*0.65} ${cy+r*0.4} Q${cx-r*0.4} ${cy-r*0.55} ${cx} ${cy-r*0.55} Q${cx+r*0.4} ${cy-r*0.55} ${cx+r*0.65} ${cy+r*0.4}`} fill={F} stroke={S} strokeWidth={W}/>
            </g>;
        }
        case 'softbox': {
            const sz = r * 0.9;
            return <g>
                <rect x={cx-sz/2} y={cy-sz/2} width={sz} height={sz} rx={r*0.04} fill={F} stroke={S} strokeWidth={W}/>
                <line x1={cx-sz/2} y1={cy-sz/2} x2={cx+sz/2} y2={cy+sz/2} stroke={S} strokeWidth={w}/>
                <line x1={cx+sz/2} y1={cy-sz/2} x2={cx-sz/2} y2={cy+sz/2} stroke={S} strokeWidth={w}/>
            </g>;
        }
        case 'practical': {
            const tw = r * 0.3; const bw2 = r * 0.7; const sh = r * 0.65;
            return <g>
                <path d={`M${cx-tw/2} ${cy-sh/2} L${cx+tw/2} ${cy-sh/2} L${cx+bw2/2} ${cy+sh*0.2} L${cx-bw2/2} ${cy+sh*0.2} Z`} fill={F} stroke={S} strokeWidth={W}/>
                <line x1={cx} y1={cy+sh*0.2} x2={cx} y2={cy+r*0.7} stroke={S} strokeWidth={W}/>
            </g>;
        }
        case 'stick': {
            return <g>
                <circle cx={cx} cy={cy-r*0.3} r={r*0.25} fill={F} stroke={S} strokeWidth={W}/>
                <line x1={cx} y1={cy-r*0.05} x2={cx} y2={cy+r*0.7} stroke={S} strokeWidth={W}/>
                <line x1={cx-r*0.15} y1={cy-r*0.6} x2={cx+r*0.15} y2={cy-r*0.6} stroke={S} strokeWidth={w}/>
                <line x1={cx+r*0.15} y1={cy-r*0.6} x2={cx+r*0.08} y2={cy-r*0.52} stroke={S} strokeWidth={w}/>
            </g>;
        }
        case 'balloon': {
            return <g>
                <circle cx={cx} cy={cy} r={r*0.6} fill={F} stroke={S} strokeWidth={W}/>
            </g>;
        }
        case 'china_ball': {
            return <g>
                <circle cx={cx} cy={cy+r*0.05} r={r*0.55} fill={F} stroke={S} strokeWidth={W}/>
                <line x1={cx} y1={cy-r*0.5} x2={cx} y2={cy-r*0.8} stroke={S} strokeWidth={w}/>
            </g>;
        }
        case 'bounce_board': {
            const bw = r * 1.3; const bh = r * 0.28;
            return <g>
                <rect x={cx-bw/2} y={cy-bh/2} width={bw} height={bh} rx={r*0.04} fill={F} stroke={S} strokeWidth={W}/>
            </g>;
        }
        case 'silk': {
            return <g>
                <line x1={cx-r*0.7} y1={cy+r*0.25} x2={cx+r*0.7} y2={cy-r*0.25} stroke={S} strokeWidth={W*1.5} strokeLinecap="round"/>
            </g>;
        }
        case 'speed_rail': {
            return <g>
                <line x1={cx-r*0.7} y1={cy} x2={cx+r*0.7} y2={cy} stroke={S} strokeWidth={W}/>
                <circle cx={cx-r*0.7} cy={cy} r={r*0.08} fill={S}/>
                <circle cx={cx+r*0.7} cy={cy} r={r*0.08} fill={S}/>
            </g>;
        }
        default: {
            return <g>
                <circle cx={cx} cy={cy} r={r*0.45} fill={F} stroke={S} strokeWidth={W}/>
                {[0,60,120,180,240,300].map(a => {
                    const rad = a * Math.PI / 180;
                    return <line key={a} x1={cx+r*0.55*Math.cos(rad)} y1={cy+r*0.55*Math.sin(rad)}
                        x2={cx+r*0.8*Math.cos(rad)} y2={cy+r*0.8*Math.sin(rad)}
                        stroke={S} strokeWidth={w} strokeLinecap="round"/>;
                })}
            </g>;
        }
    }
};

export default LightShapeSVG;
