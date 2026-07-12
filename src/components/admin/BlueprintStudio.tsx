import { Suspense, useState, useRef, useCallback, useMemo, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Sky, Grid, Environment } from '@react-three/drei';
import * as THREE from 'three';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import {
  Upload, Sun, Palette, Layers, RotateCcw, Home, Camera, Download,
  Maximize2, X, ChevronRight, Building2, MapPin, DollarSign,
  Search, Navigation, Crosshair, Map, Eye, ChevronDown, ChevronUp,
  Factory, Hotel, ShoppingBag, Warehouse, TreePine, Zap,
  LayoutGrid, SlidersHorizontal, Compass,
} from 'lucide-react';
import { toast } from 'sonner';

/* ── Mapbox token ─────────────────────────────────────────────────── */
const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN || '';

/* ── Design tokens (LIGHT theme) ─────────────────────────────────── */
const BG    = '#F4F2EF';
const CARD  = '#FFFFFF';
const BD    = '#E5E0D9';
const TX1   = '#1A1815';
const TX2   = '#7A746D';
const TX3   = '#B0A99F';
const GOLD  = '#9D7E3F';
const GOLDL = '#C4A76B';
const GOLDB = 'rgba(157,126,63,0.15)';
const GOLDBG= 'rgba(157,126,63,0.08)';

/* ── Building category types ──────────────────────────────────────── */
type BuildingCategory = 'residential' | 'commercial' | 'industrial' | 'mixed-use';

interface BuildingConfig {
  category: BuildingCategory;
  subtype: string;
  width: number;
  depth: number;
  stories: number;
  ceilingHeight: number;
  roofType: 'flat' | 'gabled' | 'hip' | 'mansard' | 'sawtooth';
  roofPitch: number;
  wallColor: string;
  trimColor: string;
  roofColor: string;
  wallMaterial: 'stucco' | 'brick' | 'glass' | 'metal' | 'concrete' | 'wood' | 'stone';
  wallRoughness: number;
  frontWindows: number;
  sideWindows: number;
  frameColor: string;
  hasPorch: boolean;
  hasDriveway: boolean;
  hasPool: boolean;
  hasParking: boolean;
  hasRooftopEquip: boolean;
  landscaping: 'minimal' | 'lush' | 'desert' | 'urban';
  timeOfDay: 'dawn' | 'morning' | 'noon' | 'golden' | 'night';
}

const DEFAULT: BuildingConfig = {
  category: 'residential',
  subtype: 'Colonial',
  width: 18, depth: 14, stories: 2, ceilingHeight: 3.1,
  roofType: 'gabled', roofPitch: 35,
  wallColor: '#E2D9CA', trimColor: '#FFFFFF', roofColor: '#1C1814',
  wallMaterial: 'stucco', wallRoughness: 0.82,
  frontWindows: 4, sideWindows: 2, frameColor: '#F5F2EE',
  hasPorch: true, hasDriveway: true, hasPool: false,
  hasParking: false, hasRooftopEquip: false,
  landscaping: 'lush', timeOfDay: 'golden',
};

/* ── Building presets by category ────────────────────────────────── */
const PRESETS: Record<BuildingCategory, { label: string; icon: React.ComponentType<any>; configs: Partial<BuildingConfig>[] }> = {
  residential: {
    label: 'Residential',
    icon: Home,
    configs: [
      { subtype: 'Modern Villa',      width: 22, depth: 16, stories: 2, roofType: 'flat',   wallColor: '#F0ECE4', wallMaterial: 'stucco', hasPorch: false, hasPool: true },
      { subtype: 'Colonial Revival',  width: 18, depth: 14, stories: 2, roofType: 'gabled', wallColor: '#E8E0D4', wallMaterial: 'brick',  hasPorch: true  },
      { subtype: 'Craftsman',         width: 16, depth: 13, stories: 2, roofType: 'gabled', wallColor: '#C8BDA8', wallMaterial: 'wood',   hasPorch: true  },
      { subtype: 'Ranch Bungalow',    width: 20, depth: 10, stories: 1, roofType: 'hip',    wallColor: '#D6CEBC', wallMaterial: 'brick',  hasDriveway: true },
      { subtype: 'Contemporary',      width: 24, depth: 18, stories: 3, roofType: 'flat',   wallColor: '#E0DDD8', wallMaterial: 'concrete', hasPool: true  },
      { subtype: 'Mediterranean',     width: 26, depth: 20, stories: 2, roofType: 'hip',    wallColor: '#EDE3C8', wallMaterial: 'stucco', hasPorch: true, hasPool: true },
    ],
  },
  commercial: {
    label: 'Commercial',
    icon: Building2,
    configs: [
      { subtype: 'Class A Office',    width: 40, depth: 30, stories: 12, roofType: 'flat', wallColor: '#B8C8D4', wallMaterial: 'glass',    hasParking: true, hasRooftopEquip: true, ceilingHeight: 3.8 },
      { subtype: 'Boutique Hotel',    width: 30, depth: 22, stories: 8,  roofType: 'flat', wallColor: '#C8B89A', wallMaterial: 'brick',    hasPorch: true,   hasRooftopEquip: true, ceilingHeight: 3.5 },
      { subtype: 'Retail Center',     width: 50, depth: 25, stories: 2,  roofType: 'flat', wallColor: '#D4CCB8', wallMaterial: 'concrete', hasParking: true, ceilingHeight: 4.0 },
      { subtype: 'Medical Campus',    width: 45, depth: 35, stories: 6,  roofType: 'flat', wallColor: '#E8E4DC', wallMaterial: 'concrete', hasParking: true, hasRooftopEquip: true, ceilingHeight: 3.6 },
      { subtype: 'Mixed-Use Tower',   width: 28, depth: 28, stories: 20, roofType: 'flat', wallColor: '#9CAAB4', wallMaterial: 'glass',    hasParking: true, hasRooftopEquip: true, ceilingHeight: 3.4 },
    ],
  },
  industrial: {
    label: 'Industrial',
    icon: Warehouse,
    configs: [
      { subtype: 'Distribution Hub',  width: 80, depth: 50, stories: 1, roofType: 'sawtooth', wallColor: '#A8B0B4', wallMaterial: 'metal',    ceilingHeight: 8.0, roofPitch: 15 },
      { subtype: 'Light Mfg Plant',   width: 60, depth: 40, stories: 1, roofType: 'flat',     wallColor: '#B4BCC0', wallMaterial: 'metal',    ceilingHeight: 7.0 },
      { subtype: 'Self-Storage',      width: 50, depth: 20, stories: 3, roofType: 'flat',     wallColor: '#C4C8CC', wallMaterial: 'metal',    ceilingHeight: 3.5 },
      { subtype: 'Flex Warehouse',    width: 45, depth: 30, stories: 2, roofType: 'flat',     wallColor: '#B8C0C4', wallMaterial: 'concrete', ceilingHeight: 5.0, hasParking: true },
    ],
  },
  'mixed-use': {
    label: 'Mixed-Use',
    icon: LayoutGrid,
    configs: [
      { subtype: 'Live-Work Lofts',   width: 24, depth: 18, stories: 5, roofType: 'flat', wallColor: '#C8BCA8', wallMaterial: 'brick',    ceilingHeight: 3.6 },
      { subtype: 'TOD Development',   width: 35, depth: 28, stories: 8, roofType: 'flat', wallColor: '#B4C0C8', wallMaterial: 'glass',    ceilingHeight: 3.5, hasParking: true },
      { subtype: 'Village Center',    width: 40, depth: 22, stories: 3, roofType: 'flat', wallColor: '#D0C4B0', wallMaterial: 'brick',    hasPorch: true,   ceilingHeight: 4.0 },
    ],
  },
};

/* ── Light presets ────────────────────────────────────────────────── */
const LIGHT = {
  dawn:    { sunPos: [10,4,30]    as [number,number,number], sunColor: '#FF9955', sunInt: 1.2, ambInt: 0.25, skyColor: '#FF6B35', fogColor: '#FFBB88', groundColor: '#4A3830' },
  morning: { sunPos: [25,18,20]   as [number,number,number], sunColor: '#FFF0DD', sunInt: 2.2, ambInt: 0.5,  skyColor: '#87CEEB', fogColor: '#C8E0F0', groundColor: '#5A7A4A' },
  noon:    { sunPos: [0,40,10]    as [number,number,number], sunColor: '#FFFEF0', sunInt: 3.0, ambInt: 0.65, skyColor: '#5090D0', fogColor: '#B0CCE0', groundColor: '#5A8040' },
  golden:  { sunPos: [-20,6,25]   as [number,number,number], sunColor: '#FFB347', sunInt: 2.0, ambInt: 0.35, skyColor: '#FF6B35', fogColor: '#FFBB88', groundColor: '#3D4A28' },
  night:   { sunPos: [-40,-10,-20]as [number,number,number], sunColor: '#112244', sunInt: 0.1, ambInt: 0.08, skyColor: '#020B18', fogColor: '#060E1A', groundColor: '#080808' },
};

/* ── Satellite ground texture ─────────────────────────────────────── */
function useSatelliteTexture(lat: number | null, lng: number | null): THREE.Texture | null {
  const [texture, setTexture] = useState<THREE.Texture | null>(null);
  useEffect(() => {
    if (lat === null || lng === null || !MAPBOX_TOKEN) return;
    const url = `https://api.mapbox.com/styles/v1/mapbox/satellite-v9/static/${lng.toFixed(6)},${lat.toFixed(6)},17,0/512x512@2x?access_token=${MAPBOX_TOKEN}`;
    const loader = new THREE.TextureLoader();
    loader.load(url, (t) => {
      t.wrapS = THREE.ClampToEdgeWrapping;
      t.wrapT = THREE.ClampToEdgeWrapping;
      setTexture(t);
    });
  }, [lat, lng]);
  return texture;
}

/* ── Landscape ────────────────────────────────────────────────────── */
function Landscape({ config, satTexture }: { config: BuildingConfig; satTexture: THREE.Texture | null }) {
  const lp = LIGHT[config.timeOfDay];
  const isNight = config.timeOfDay === 'night';
  const grassColor = isNight ? '#0A1505' : config.landscaping === 'desert' ? '#B8A87A' : config.landscaping === 'urban' ? '#6A6A6A' : '#4A7A36';

  return (
    <group>
      {/* Main ground — satellite texture or color */}
      <mesh rotation={[-Math.PI/2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[120, 120]} />
        <meshStandardMaterial
          map={satTexture ?? undefined}
          color={satTexture ? '#FFFFFF' : grassColor}
          roughness={0.95} metalness={0}
        />
      </mesh>

      {/* Sidewalk */}
      <mesh rotation={[-Math.PI/2, 0, 0]} position={[0, 0.005, config.depth / 2 + 5]} receiveShadow>
        <planeGeometry args={[config.width + 4, 4]} />
        <meshStandardMaterial color="#A09588" roughness={0.9} metalness={0} />
      </mesh>

      {/* Driveway */}
      {config.hasDriveway && (
        <mesh rotation={[-Math.PI/2, 0, 0]} position={[config.width / 4, 0.006, config.depth / 2 + 12]} receiveShadow>
          <planeGeometry args={[5.5, 20]} />
          <meshStandardMaterial color="#7A706A" roughness={0.85} metalness={0} />
        </mesh>
      )}

      {/* Parking lot */}
      {config.hasParking && (
        <group>
          <mesh rotation={[-Math.PI/2, 0, 0]} position={[-config.width / 2 - 20, 0.006, 0]} receiveShadow>
            <planeGeometry args={[30, config.depth + 10]} />
            <meshStandardMaterial color="#6A6360" roughness={0.9} metalness={0} />
          </mesh>
          {[-1,0,1].map(r => (
            <mesh key={r} rotation={[-Math.PI/2,0,0]} position={[-config.width/2-20, 0.012, r * 8]}>
              <planeGeometry args={[28, 0.12]} />
              <meshStandardMaterial color="#FFFFFF" roughness={0.6} metalness={0} />
            </mesh>
          ))}
        </group>
      )}

      {/* Pool */}
      {config.hasPool && (
        <group position={[-config.width / 2 - 4, 0, config.depth / 4]}>
          <mesh rotation={[-Math.PI/2, 0, 0]} position={[0, -0.3, 0]} receiveShadow>
            <planeGeometry args={[8, 5]} />
            <meshPhysicalMaterial color="#1A8AD4" roughness={0.05} metalness={0.1} transmission={0.6} transparent opacity={0.8} />
          </mesh>
          <mesh position={[0, -0.3, 0]}>
            <boxGeometry args={[8.4, 0.6, 5.4]} />
            <meshStandardMaterial color="#C8C0B8" roughness={0.7} metalness={0.05} />
          </mesh>
        </group>
      )}

      {/* Trees */}
      {config.landscaping !== 'minimal' && config.landscaping !== 'urban' && (
        [
          [-config.width / 2 - 4, 0, -4], [-config.width / 2 - 7, 0, 4],
          [config.width / 2 + 4, 0, -3],  [config.width / 2 + 7, 0, 5],
          [-config.width / 2 - 3, 0, config.depth / 2 + 8],
          [config.width / 2 + 3, 0, config.depth / 2 + 8],
        ].map(([x, y, z], i) => <Tree key={i} position={[x, y, z] as [number,number,number]} config={config} />)
      )}

      {/* Desert cacti */}
      {config.landscaping === 'desert' && (
        [[-5,0,8],[7,0,6],[-8,0,-3]].map(([x,y,z],i) => <Cactus key={i} position={[x,y,z] as [number,number,number]} />)
      )}

      {/* Lush garden beds */}
      {config.landscaping === 'lush' && (
        <>
          <mesh rotation={[-Math.PI/2,0,0]} position={[-config.width/4, 0.006, config.depth/2+1]}>
            <planeGeometry args={[4, 1.5]} /><meshStandardMaterial color="#3D6B2C" roughness={0.95} />
          </mesh>
          <mesh rotation={[-Math.PI/2,0,0]} position={[config.width/4, 0.006, config.depth/2+1]}>
            <planeGeometry args={[4, 1.5]} /><meshStandardMaterial color="#3D6B2C" roughness={0.95} />
          </mesh>
        </>
      )}

      {/* Urban planters */}
      {config.landscaping === 'urban' && (
        [[-config.width/2-2, 0, config.depth/2+3],[config.width/2+2, 0, config.depth/2+3]].map(([x,y,z],i) => (
          <group key={i} position={[x,y,z] as [number,number,number]}>
            <mesh position={[0, 0.3, 0]} castShadow>
              <boxGeometry args={[1.8, 0.6, 1.8]} />
              <meshStandardMaterial color="#6A6360" roughness={0.85} />
            </mesh>
            <mesh position={[0, 0.8, 0]} castShadow>
              <sphereGeometry args={[0.8, 8, 8]} />
              <meshStandardMaterial color="#3A7030" roughness={0.9} />
            </mesh>
          </group>
        ))
      )}
    </group>
  );
}

function Tree({ position, config }: { position: [number,number,number]; config: BuildingConfig }) {
  const trunkColor = config.timeOfDay === 'night' ? '#1A1005' : '#6B4A2A';
  const leafColor  = config.timeOfDay === 'night' ? '#0A1505' : config.landscaping === 'desert' ? '#5A7A3A' : '#2A6A1A';
  const h = 5 + Math.sin(position[0]) * 1.5;
  return (
    <group position={position}>
      <mesh castShadow position={[0, h * 0.3, 0]}>
        <cylinderGeometry args={[0.2, 0.35, h * 0.6, 8]} />
        <meshStandardMaterial color={trunkColor} roughness={0.9} />
      </mesh>
      <mesh castShadow position={[0, h * 0.75, 0]}>
        <coneGeometry args={[2, h * 0.7, 8]} />
        <meshStandardMaterial color={leafColor} roughness={0.8} />
      </mesh>
    </group>
  );
}

function Cactus({ position }: { position: [number,number,number] }) {
  return (
    <group position={position}>
      <mesh castShadow position={[0, 2, 0]}>
        <cylinderGeometry args={[0.3, 0.4, 4, 8]} />
        <meshStandardMaterial color="#4A7A3A" roughness={0.7} />
      </mesh>
      <mesh castShadow position={[0.8, 1.5, 0]} rotation={[0, 0, -0.5]}>
        <cylinderGeometry args={[0.2, 0.25, 1.8, 8]} />
        <meshStandardMaterial color="#4A7A3A" roughness={0.7} />
      </mesh>
    </group>
  );
}

/* ── Building ─────────────────────────────────────────────────────── */
function Building({ config }: { config: BuildingConfig }) {
  const { width, depth, stories, ceilingHeight, roofType, roofPitch,
          wallColor, trimColor, roofColor, wallRoughness,
          frontWindows, sideWindows, frameColor, hasPorch, timeOfDay, wallMaterial, hasRooftopEquip } = config;

  const totalH = stories * ceilingHeight;
  const isGlass = wallMaterial === 'glass';
  const isNight = timeOfDay === 'night';

  const wallMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: new THREE.Color(wallColor),
    roughness: isGlass ? 0.04 : wallRoughness,
    metalness: isGlass ? 0.15 : 0.01,
    transparent: isGlass,
    opacity: isGlass ? 0.72 : 1,
  }), [wallColor, wallRoughness, isGlass]);

  const trimMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: new THREE.Color(trimColor), roughness: 0.45, metalness: 0.05,
  }), [trimColor]);

  const roofMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: new THREE.Color(roofColor), roughness: 0.88, metalness: 0.02,
  }), [roofColor]);

  const glassMat = useMemo(() => new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(isNight ? '#FFD888' : '#9EC8DC'),
    roughness: 0.04, metalness: 0.08, transparent: true,
    opacity: isNight ? 0.85 : 0.48,
    transmission: isNight ? 0 : 0.55, reflectivity: 0.9,
    emissive: new THREE.Color(isNight ? '#AA8820' : '#000000'),
    emissiveIntensity: isNight ? 1.2 : 0,
  }), [isNight]);

  const frameMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: new THREE.Color(frameColor), roughness: 0.38, metalness: 0.08,
  }), [frameColor]);

  const concreteMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#9A9590', roughness: 0.88, metalness: 0,
  }), []);

  const wH = Math.min(ceilingHeight * 0.44, 1.45);
  const wW = 1.22;
  const windowY = ceilingHeight * 0.58;

  // High-rise curtain wall — full-height glass panels
  const isHighrise = stories >= 6;

  return (
    <group>
      {/* Foundation */}
      <mesh position={[0, 0.2, 0]} receiveShadow castShadow>
        <boxGeometry args={[width + 0.6, 0.4, depth + 0.6]} />
        <primitive object={concreteMat} attach="material" />
      </mesh>

      {/* Main mass */}
      <mesh position={[0, totalH / 2 + 0.4, 0]} castShadow receiveShadow>
        <boxGeometry args={[width, totalH, depth]} />
        <primitive object={wallMat} attach="material" />
      </mesh>

      {/* Curtain-wall glass overlay for high-rise glass buildings */}
      {isHighrise && isGlass && Array.from({ length: stories }, (_, fl) => (
        <mesh key={`cw-${fl}`} position={[0, ceilingHeight * fl + ceilingHeight / 2 + 0.4, depth / 2 + 0.02]} castShadow>
          <boxGeometry args={[width - 0.4, ceilingHeight - 0.2, 0.08]} />
          <primitive object={glassMat} attach="material" />
        </mesh>
      ))}

      {/* Story trim bands */}
      {Array.from({ length: stories - 1 }, (_, i) => (
        <mesh key={`band-${i}`} position={[0, ceilingHeight * (i + 1) + 0.4, 0]} castShadow>
          <boxGeometry args={[width + 0.08, 0.22, depth + 0.08]} />
          <primitive object={trimMat} attach="material" />
        </mesh>
      ))}

      {/* Corner pilasters (residential / low-rise only) */}
      {!isHighrise && ([-1,1] as const).flatMap(sx => ([-1,1] as const).map(sz => (
        <mesh key={`col-${sx}-${sz}`} position={[sx * (width/2+0.04), totalH/2+0.4, sz * (depth/2+0.04)]} castShadow>
          <boxGeometry args={[0.28, totalH+0.05, 0.28]} />
          <primitive object={trimMat} attach="material" />
        </mesh>
      )))}

      {/* Front windows */}
      {!isHighrise && Array.from({ length: stories }, (_, fl) =>
        Array.from({ length: frontWindows }, (_, wi) => {
          const x = -width/2 + (width/(frontWindows+1)) * (wi+1);
          const y = ceilingHeight * fl + windowY + 0.4;
          return <WindowUnit key={`fw-${fl}-${wi}`} position={[x, y, depth/2+0.08]} size={[wW, wH]} depth={0.22} frameMat={frameMat} glassMat={glassMat} />;
        })
      ).flat()}

      {/* Side windows */}
      {!isHighrise && Array.from({ length: stories }, (_, fl) =>
        Array.from({ length: sideWindows }, (_, wi) => {
          const z = -depth/2 + (depth/(sideWindows+1)) * (wi+1);
          const y = ceilingHeight * fl + windowY + 0.4;
          return [
            <WindowUnit key={`sw-r-${fl}-${wi}`} position={[width/2+0.08, y, z]} size={[wH, wW]} depth={0.22} frameMat={frameMat} glassMat={glassMat} rotY={Math.PI/2} />,
            <WindowUnit key={`sw-l-${fl}-${wi}`} position={[-width/2-0.08, y, z]} size={[wH, wW]} depth={0.22} frameMat={frameMat} glassMat={glassMat} rotY={Math.PI/2} />,
          ];
        })
      ).flat()}

      {/* Front door */}
      <group position={[width > 12 ? -width/6 : 0, 1.25+0.4, depth/2+0.09]}>
        <mesh castShadow><boxGeometry args={[1.14, 2.54, 0.22]} /><primitive object={frameMat} attach="material" /></mesh>
        <mesh position={[0, 0, 0.08]} castShadow><boxGeometry args={[0.96, 2.3, 0.09]} /><meshStandardMaterial color="#1A1208" roughness={0.55} metalness={0.12} /></mesh>
        <mesh position={[0.72, 0.3, 0.08]} castShadow><boxGeometry args={[0.36, 1.5, 0.07]} /><primitive object={glassMat} attach="material" /></mesh>
        <mesh position={[0.36, 0, 0.14]} castShadow><cylinderGeometry args={[0.025, 0.025, 0.2, 8]} /><meshStandardMaterial color="#C8A850" roughness={0.2} metalness={0.8} /></mesh>
      </group>

      {/* Lobby entrance for commercial */}
      {config.category !== 'residential' && (
        <group position={[0, 2.5, depth/2+0.3]}>
          <mesh castShadow><boxGeometry args={[8, 5, 0.6]} /><primitive object={glassMat} attach="material" /></mesh>
          <mesh position={[0, -2.5, 0.2]} castShadow><boxGeometry args={[8, 0.3, 1]} /><primitive object={concreteMat} attach="material" /></mesh>
        </group>
      )}

      {/* Porch */}
      {hasPorch && (
        <group position={[0, 0, depth/2]}>
          <mesh position={[0, 0.08, 2]} receiveShadow><boxGeometry args={[width*0.55, 0.16, 4.2]} /><primitive object={concreteMat} attach="material" /></mesh>
          {[0.08,-0.08,-0.24].map((dy, i) => (
            <mesh key={i} position={[0, dy*i+0.04, 4+i*0.24]} receiveShadow>
              <boxGeometry args={[width*0.45, 0.16, 0.5]} /><primitive object={concreteMat} attach="material" />
            </mesh>
          ))}
          <mesh position={[0, totalH*0.42, 2.2]} castShadow><boxGeometry args={[width*0.6, 0.18, 4.6]} /><primitive object={roofMat} attach="material" /></mesh>
          {[-1,1].map(s => (
            <mesh key={s} position={[s*width*0.24, totalH*0.21, 4.2]} castShadow>
              <cylinderGeometry args={[0.16, 0.18, totalH*0.42, 12]} /><primitive object={trimMat} attach="material" />
            </mesh>
          ))}
        </group>
      )}

      {/* Rooftop equipment */}
      {hasRooftopEquip && (
        <group position={[0, totalH + 0.4, 0]}>
          {[-1, 1].map(s => (
            <mesh key={s} position={[s * width * 0.25, 1.2, 0]} castShadow>
              <boxGeometry args={[4, 2.4, 3]} />
              <meshStandardMaterial color="#5A6068" roughness={0.7} metalness={0.3} />
            </mesh>
          ))}
          <mesh position={[0, 0.8, -depth * 0.3]} castShadow>
            <cylinderGeometry args={[0.8, 0.8, 1.6, 12]} />
            <meshStandardMaterial color="#4A5058" roughness={0.5} metalness={0.5} />
          </mesh>
        </group>
      )}

      <Roof config={config} totalH={totalH} roofMat={roofMat} trimMat={trimMat} />
    </group>
  );
}

function WindowUnit({ position, size, depth, frameMat, glassMat, rotY = 0 }:
  { position: [number,number,number]; size: [number,number]; depth: number; frameMat: THREE.Material; glassMat: THREE.Material; rotY?: number }) {
  const [w, h] = size;
  const border = 0.09;
  return (
    <group position={position} rotation={[0, rotY, 0]}>
      <mesh castShadow><boxGeometry args={[w+border*2, h+border*2, depth]} /><primitive object={frameMat} attach="material" /></mesh>
      <mesh position={[0, 0, depth*0.1]}><boxGeometry args={[w, h, depth*0.25]} /><primitive object={glassMat} attach="material" /></mesh>
      <mesh position={[0, 0, depth*0.22]}><boxGeometry args={[w+0.02, 0.04, 0.04]} /><primitive object={frameMat} attach="material" /></mesh>
    </group>
  );
}

function Roof({ config, totalH, roofMat, trimMat }:
  { config: BuildingConfig; totalH: number; roofMat: THREE.Material; trimMat: THREE.Material }) {
  const { width, depth, roofType, roofPitch } = config;
  const pitchH = (width / 2) * Math.tan((roofPitch * Math.PI) / 180);
  const base = totalH + 0.4;

  if (roofType === 'flat' || roofType === 'sawtooth') {
    return (
      <mesh position={[0, base + 0.22, 0]} castShadow receiveShadow>
        <boxGeometry args={[width + 0.4, 0.44, depth + 0.4]} />
        <primitive object={roofMat} attach="material" />
      </mesh>
    );
  }
  if (roofType === 'gabled') {
    const shape = new THREE.Shape();
    shape.moveTo(-width/2-0.5, 0); shape.lineTo(width/2+0.5, 0); shape.lineTo(0, pitchH); shape.closePath();
    const extSettings = { depth: depth + 1.0, bevelEnabled: false };
    return (
      <group position={[0, base, -depth/2-0.5]}>
        <mesh castShadow receiveShadow>
          <extrudeGeometry args={[shape, extSettings]} /><primitive object={roofMat} attach="material" />
        </mesh>
        <mesh position={[0, pitchH-0.06, depth/2+0.5]} castShadow>
          <boxGeometry args={[0.2, 0.12, depth+1.2]} /><primitive object={trimMat} attach="material" />
        </mesh>
      </group>
    );
  }
  if (roofType === 'mansard') {
    return (
      <group>
        <mesh position={[0, base + 1.5, 0]} castShadow receiveShadow>
          <boxGeometry args={[width * 0.7, 3, depth * 0.7]} />
          <primitive object={roofMat} attach="material" />
        </mesh>
        <mesh position={[0, base + 0.22, 0]} castShadow>
          <boxGeometry args={[width + 0.4, 0.44, depth + 0.4]} />
          <primitive object={roofMat} attach="material" />
        </mesh>
      </group>
    );
  }
  // Hip roof
  const hipPts: [number,number,number][] = [
    [-width/2-0.4, 0, -depth/2-0.4], [width/2+0.4, 0, -depth/2-0.4],
    [width/2+0.4, 0, depth/2+0.4],   [-width/2-0.4, 0, depth/2+0.4],
    [0, pitchH*0.6, -depth/4], [0, pitchH*0.6, depth/4],
  ];
  const faces = [[0,1,5,4],[1,2,5],[2,3,4,5],[3,0,4]];
  const positions: number[] = [];
  faces.forEach(face => { for (let i=1;i<face.length-1;i++) { [face[0],face[i],face[i+1]].forEach(fi => positions.push(...hipPts[fi])); } });
  const geom = new THREE.BufferGeometry();
  geom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geom.computeVertexNormals();
  return <mesh geometry={geom} position={[0, base, 0]} castShadow receiveShadow><primitive object={roofMat} attach="material" /></mesh>;
}

/* ── Scene ────────────────────────────────────────────────────────── */
function CameraController({ target }: { target: [number,number,number] }) {
  const { camera } = useThree();
  useEffect(() => { camera.position.set(...target); camera.lookAt(0, 5, 0); }, [target[0], target[1], target[2]]);
  return null;
}

function Scene({ config, camPos, satTexture }: { config: BuildingConfig; camPos: [number,number,number]; satTexture: THREE.Texture | null }) {
  const lp = LIGHT[config.timeOfDay];
  return (
    <>
      <color attach="background" args={[lp.fogColor]} />
      <fog attach="fog" args={[lp.fogColor, 55, 220]} />

      <directionalLight
        position={lp.sunPos} intensity={lp.sunInt} color={lp.sunColor} castShadow
        shadow-mapSize={[4096, 4096]}
        shadow-camera-far={150} shadow-camera-left={-70} shadow-camera-right={70}
        shadow-camera-top={70} shadow-camera-bottom={-70} shadow-bias={-0.0004}
      />
      <ambientLight intensity={lp.ambInt} color={lp.skyColor} />
      <hemisphereLight args={[lp.skyColor as any, lp.groundColor as any, 0.5]} />

      {config.timeOfDay === 'night' && (
        <>
          <pointLight position={[0, 3, config.depth/2+3]} intensity={8} color="#FFE8AA" distance={14} decay={2} />
          <pointLight position={[config.width/3, 2, 0]} intensity={4} color="#FFD070" distance={10} decay={2} castShadow />
          <pointLight position={[-config.width/3, 1.5, -2]} intensity={3} color="#FFE8AA" distance={8} decay={2} />
        </>
      )}

      <Sky
        sunPosition={lp.sunPos}
        turbidity={config.timeOfDay==='golden'||config.timeOfDay==='dawn'?10:config.timeOfDay==='night'?20:4}
        rayleigh={config.timeOfDay==='golden'||config.timeOfDay==='dawn'?3:1}
        mieCoefficient={0.005} mieDirectionalG={0.85}
      />

      <Landscape config={config} satTexture={satTexture} />
      <Building config={config} />

      <Grid
        args={[100, 100]} cellSize={1} cellThickness={0.3}
        cellColor={config.timeOfDay==='night'?'#1A2A0A':'#3A6030'}
        sectionSize={5} sectionThickness={0.8}
        sectionColor={config.timeOfDay==='night'?'#0A1505':'#2A5025'}
        fadeDistance={50} fadeStrength={1.5}
        position={[0, 0.01, 0]} infiniteGrid
      />

      <CameraController target={camPos} />
      <OrbitControls
        target={[0, config.stories * config.ceilingHeight * 0.45, 0]}
        minDistance={6} maxDistance={120} maxPolarAngle={Math.PI / 2.05}
        enableDamping dampingFactor={0.06}
      />
    </>
  );
}

/* ── Mapbox location panel ────────────────────────────────────────── */
interface Location { lat: number; lng: number; address: string }

function MapPanel({ location, onSetLocation, collapsed, onToggle }: {
  location: Location | null;
  onSetLocation: (loc: Location) => void;
  collapsed: boolean;
  onToggle: () => void;
}) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef       = useRef<mapboxgl.Map | null>(null);
  const markerRef    = useRef<mapboxgl.Marker | null>(null);
  const [searchVal, setSearchVal] = useState('');
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    if (!mapContainer.current || mapRef.current || collapsed) return;
    if (!MAPBOX_TOKEN) return;
    mapboxgl.accessToken = MAPBOX_TOKEN;
    const map = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/satellite-streets-v12',
      center: location ? [location.lng, location.lat] : [-95.3698, 29.7604],
      zoom: 16,
      attributionControl: false,
    });

    map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), 'bottom-right');

    if (location) {
      markerRef.current = new mapboxgl.Marker({ color: GOLD })
        .setLngLat([location.lng, location.lat]).addTo(map);
    }

    map.on('click', async (e) => {
      const { lat, lng } = e.lngLat;
      if (markerRef.current) markerRef.current.remove();
      markerRef.current = new mapboxgl.Marker({ color: GOLD }).setLngLat([lng, lat]).addTo(map);
      // Reverse geocode
      try {
        const res = await fetch(`https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${MAPBOX_TOKEN}&types=address,place`);
        const json = await res.json();
        const address = json.features?.[0]?.place_name ?? `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
        onSetLocation({ lat, lng, address });
        toast.success('Location pinned — satellite imagery loading…');
      } catch {
        onSetLocation({ lat, lng, address: `${lat.toFixed(5)}, ${lng.toFixed(5)}` });
      }
    });

    mapRef.current = map;
    return () => { map.remove(); mapRef.current = null; };
  }, [collapsed]);

  const searchAddress = async () => {
    if (!searchVal.trim() || !MAPBOX_TOKEN) return;
    setSearching(true);
    try {
      const res = await fetch(`https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(searchVal)}.json?access_token=${MAPBOX_TOKEN}&limit=1`);
      const json = await res.json();
      const feat = json.features?.[0];
      if (!feat) { toast.error('Address not found'); return; }
      const [lng, lat] = feat.center;
      mapRef.current?.flyTo({ center: [lng, lat], zoom: 17, duration: 1400 });
      if (markerRef.current) markerRef.current.remove();
      markerRef.current = new mapboxgl.Marker({ color: GOLD }).setLngLat([lng, lat]).addTo(mapRef.current!);
      onSetLocation({ lat, lng, address: feat.place_name });
      toast.success('Location found');
    } catch { toast.error('Search failed'); }
    finally { setSearching(false); }
  };

  return (
    <div style={{
      background: CARD, borderTop: `1px solid ${BD}`, flexShrink: 0,
      display: 'flex', flexDirection: 'column',
      height: collapsed ? 44 : 300, transition: 'height 0.3s ease',
      overflow: 'hidden',
    }}>
      {/* Panel header */}
      <button
        onClick={onToggle}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0 16px', height: 44, background: 'transparent', border: 'none',
          cursor: 'pointer', borderBottom: collapsed ? 'none' : `1px solid ${BD}`, flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <MapPin style={{ width: 13, height: 13, color: GOLD }} strokeWidth={1.8} />
          <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: TX1 }}>
            Site Location
          </span>
          {location && (
            <span style={{
              fontSize: 9, padding: '1px 6px', background: GOLDBG, border: `1px solid ${GOLDB}`,
              color: GOLD, fontWeight: 600, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {location.address}
            </span>
          )}
        </div>
        {collapsed
          ? <ChevronUp style={{ width: 13, height: 13, color: TX3 }} />
          : <ChevronDown style={{ width: 13, height: 13, color: TX3 }} />}
      </button>

      {/* Search bar */}
      {!collapsed && (
        <div style={{ display: 'flex', gap: 6, padding: '8px 12px', flexShrink: 0, borderBottom: `1px solid ${BD}` }}>
          <input
            value={searchVal}
            onChange={e => setSearchVal(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && searchAddress()}
            placeholder="Search address, city, or coordinates…"
            style={{
              flex: 1, padding: '7px 12px', fontSize: 12, border: `1px solid ${BD}`,
              background: BG, color: TX1, outline: 'none',
              fontFamily: "'Inter', sans-serif",
            }}
          />
          <button
            onClick={searchAddress}
            disabled={searching}
            style={{
              padding: '7px 14px', background: GOLD, border: 'none', color: '#fff',
              fontSize: 11, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5,
            }}
          >
            {searching ? '…' : <><Search style={{ width: 12, height: 12 }} /> Go</>}
          </button>
        </div>
      )}

      {/* Map */}
      {!collapsed && (
        <div style={{ flex: 1, position: 'relative' }}>
          <div ref={mapContainer} style={{ width: '100%', height: '100%' }} />
          {!MAPBOX_TOKEN && (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: BD2, color: TX2, fontSize: 12 }}>
              Add VITE_MAPBOX_TOKEN to .env to enable map
            </div>
          )}
          <div style={{
            position: 'absolute', bottom: 8, left: 8, fontSize: 9, color: 'rgba(255,255,255,0.75)',
            background: 'rgba(0,0,0,0.5)', padding: '3px 8px', pointerEvents: 'none',
          }}>
            Click map to plant building · drag pin to reposition
          </div>
        </div>
      )}
    </div>
  );
}

const BD2 = '#F0ECE7';

/* ── Cost estimator ───────────────────────────────────────────────── */
function CostEstimator({ config }: { config: BuildingConfig }) {
  const sqft  = Math.round(config.width * config.depth * config.stories * 10.764);
  const rates: Record<BuildingCategory, [number, number]> = {
    residential:  [200, 450],
    commercial:   [300, 650],
    industrial:   [100, 220],
    'mixed-use':  [280, 580],
  };
  const [low, high] = rates[config.category];
  const matMultiplier = config.wallMaterial === 'glass' ? 1.4 : config.wallMaterial === 'stone' ? 1.3 : config.wallMaterial === 'brick' ? 1.15 : 1;
  const lowCost  = Math.round(sqft * low  * matMultiplier);
  const highCost = Math.round(sqft * high * matMultiplier);
  const fmt = (n: number) => n >= 1_000_000 ? `$${(n/1_000_000).toFixed(1)}M` : `$${(n/1000).toFixed(0)}K`;

  return (
    <div style={{ padding: '14px 16px', background: GOLDBG, borderTop: `1px solid ${GOLDB}` }}>
      <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: GOLD, marginBottom: 10 }}>
        Cost Estimate
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
        <div style={{ background: CARD, border: `1px solid ${BD}`, padding: '8px 10px', textAlign: 'center' }}>
          <div style={{ fontSize: 9, color: TX3, marginBottom: 3 }}>RANGE LOW</div>
          <div style={{ fontSize: 16, fontWeight: 800, color: GREEN, fontVariantNumeric: 'tabular-nums' }}>{fmt(lowCost)}</div>
        </div>
        <div style={{ background: CARD, border: `1px solid ${BD}`, padding: '8px 10px', textAlign: 'center' }}>
          <div style={{ fontSize: 9, color: TX3, marginBottom: 3 }}>RANGE HIGH</div>
          <div style={{ fontSize: 16, fontWeight: 800, color: TX1, fontVariantNumeric: 'tabular-nums' }}>{fmt(highCost)}</div>
        </div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: TX2 }}>
        <span>{sqft.toLocaleString()} sq ft</span>
        <span>{config.stories} stor{config.stories===1?'y':'ies'} · {config.wallMaterial}</span>
      </div>
    </div>
  );
}

/* ── Control panel helpers ────────────────────────────────────────── */
const GREEN = '#16a34a';

function CtrlSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ borderBottom: `1px solid ${BD}`, paddingBottom: 16, marginBottom: 16 }}>
      <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.22em', textTransform: 'uppercase', color: TX3, marginBottom: 12 }}>
        {title}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>{children}</div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={{ fontSize: 10, fontWeight: 600, color: TX2, marginBottom: 6 }}>{label}</div>
      {children}
    </div>
  );
}

function ColorSwatch({ color, onChange }: { color: string; onChange: (c: string) => void }) {
  return (
    <label style={{
      position: 'relative', display: 'inline-block', width: 32, height: 32,
      border: `1px solid ${BD}`, cursor: 'pointer', overflow: 'hidden',
    }}>
      <div style={{ position: 'absolute', inset: 0, background: color }} />
      <input type="color" value={color} onChange={e => onChange(e.target.value)}
        style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer', width: '100%', height: '100%' }} />
    </label>
  );
}

function SliderRow({ label, value, min, max, step=1, onChange, unit='' }:
  { label: string; value: number; min: number; max: number; step?: number; onChange: (v: number) => void; unit?: string }) {
  return (
    <Field label={`${label}: ${value}${unit}`}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <input
          type="range" min={min} max={max} step={step} value={value}
          onChange={e => onChange(Number(e.target.value))}
          style={{
            flex: 1, height: 4, appearance: 'none', background: BD,
            outline: 'none', cursor: 'pointer',
            accentColor: GOLD,
          }}
        />
        <span style={{ fontSize: 10, color: TX2, width: 36, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
          {value}{unit}
        </span>
      </div>
    </Field>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
      <div
        onClick={() => onChange(!checked)}
        style={{
          width: 34, height: 18, background: checked ? GOLD : BD, borderRadius: 9,
          position: 'relative', transition: 'background 0.2s', flexShrink: 0,
        }}
      >
        <div style={{
          position: 'absolute', top: 2, left: checked ? 16 : 2, width: 14, height: 14,
          background: '#fff', borderRadius: '50%', transition: 'left 0.2s',
          boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
        }} />
      </div>
      <span style={{ fontSize: 11, color: TX1 }}>{label}</span>
    </label>
  );
}

function SelectRow({ label, value, options, onChange }: {
  label: string; value: string; options: { v: string; label: string }[]; onChange: (v: string) => void;
}) {
  return (
    <Field label={label}>
      <select
        value={value} onChange={e => onChange(e.target.value)}
        style={{
          width: '100%', padding: '7px 10px', fontSize: 11, border: `1px solid ${BD}`,
          background: BG, color: TX1, outline: 'none', cursor: 'pointer',
          fontFamily: "'Inter', sans-serif",
        }}
      >
        {options.map(o => <option key={o.v} value={o.v}>{o.label}</option>)}
      </select>
    </Field>
  );
}

/* ── Camera presets ───────────────────────────────────────────────── */
const CAM_PRESETS: { label: string; pos: [number,number,number] }[] = [
  { label: 'Street',  pos: [0, 5, 32] },
  { label: 'Corner',  pos: [22, 13, 22] },
  { label: 'Aerial',  pos: [0, 45, 20] },
  { label: 'Side',    pos: [32, 8, 0] },
  { label: 'Rear',    pos: [0, 7, -30] },
];

type Panel = 'build' | 'style' | 'site' | 'lighting';

interface AnalysisResult { width: number; depth: number; stories: number; rooms: string[]; sqft: number }

/* ═══════════════════════════════════════════════════════════════════
   MAIN EXPORT
═══════════════════════════════════════════════════════════════════ */
export default function BlueprintStudio() {
  const [config, setConfig]       = useState<BuildingConfig>(DEFAULT);
  const [panel, setPanel]         = useState<Panel>('build');
  const [camPos, setCamPos]       = useState<[number,number,number]>([22, 13, 22]);
  const [blueprint, setBlueprint] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis]   = useState<AnalysisResult | null>(null);
  const [fullscreen, setFullscreen] = useState(false);
  const [location, setLocation]   = useState<Location | null>(null);
  const [mapCollapsed, setMapCollapsed] = useState(false);
  const [sidebarOpen, setSidebarOpen]   = useState(true);
  const [activeCategory, setActiveCategory] = useState<BuildingCategory>('residential');
  const fileRef          = useRef<HTMLInputElement>(null);
  const canvasRef        = useRef<HTMLDivElement>(null);

  const satTexture = useSatelliteTexture(location?.lat ?? null, location?.lng ?? null);

  const set = <K extends keyof BuildingConfig>(k: K, v: BuildingConfig[K]) =>
    setConfig(p => ({ ...p, [k]: v }));

  const applyPreset = (preset: Partial<BuildingConfig>) =>
    setConfig(p => ({ ...p, ...preset }));

  const handleUpload = useCallback(async (file: File) => {
    const url = URL.createObjectURL(file);
    setBlueprint(url);
    setAnalyzing(true);
    toast('Analyzing blueprint…', { icon: '🔍' });
    await new Promise(r => setTimeout(r, 2200));
    const fakeAnalysis: AnalysisResult = {
      width: Math.round(14 + Math.random() * 10),
      depth: Math.round(10 + Math.random() * 8),
      stories: Math.random() > 0.4 ? 2 : 1,
      rooms: ['Living Room', 'Kitchen', 'Master Suite', 'Bedroom 2', 'Bedroom 3', 'Garage', 'Utility'],
      sqft: Math.round(1800 + Math.random() * 1400),
    };
    setAnalysis(fakeAnalysis);
    setConfig(p => ({ ...p, width: fakeAnalysis.width, depth: fakeAnalysis.depth, stories: fakeAnalysis.stories }));
    setAnalyzing(false);
    toast.success(`Blueprint analyzed — ${fakeAnalysis.sqft.toLocaleString()} sq ft detected`);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (f) handleUpload(f);
  }, [handleUpload]);

  const handleReset = () => { setConfig(DEFAULT); setBlueprint(null); setAnalysis(null); setLocation(null); toast('Studio reset'); };

  const downloadScreenshot = () => {
    const canvas = canvasRef.current?.querySelector('canvas');
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = `blueprint-render-${Date.now()}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
    toast.success('Render saved');
  };

  const PANEL_TABS: { key: Panel; label: string }[] = [
    { key: 'build',    label: 'Structure' },
    { key: 'style',    label: 'Materials' },
    { key: 'site',     label: 'Site' },
    { key: 'lighting', label: 'Lighting' },
  ];

  const categoryPresets = PRESETS[activeCategory];

  return (
    <div
      style={{
        display: 'flex', flexDirection: 'column',
        height: fullscreen ? '100vh' : 'calc(100vh - 60px)',
        background: BG, fontFamily: "'Inter', system-ui, sans-serif",
        position: fullscreen ? 'fixed' : 'relative',
        inset: fullscreen ? 0 : 'auto', zIndex: fullscreen ? 9999 : 'auto',
        overflow: 'hidden',
      }}
    >

      {/* ══════════════════════════════════════════════
          TOP TOOLBAR
      ══════════════════════════════════════════════ */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 0, height: 52,
        background: CARD, borderBottom: `1px solid ${BD}`, flexShrink: 0,
        paddingLeft: 16, paddingRight: 12, overflow: 'hidden',
      }}>
        {/* Brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginRight: 20, flexShrink: 0 }}>
          <div style={{ width: 28, height: 28, background: GOLD, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Layers style={{ width: 13, height: 13, color: '#fff' }} strokeWidth={1.5} />
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 800, color: TX1, letterSpacing: '-0.01em', lineHeight: 1 }}>Blueprint Studio</div>
            <div style={{ fontSize: 8, color: TX3, letterSpacing: '0.12em', textTransform: 'uppercase' }}>Enterprise 3D Builder</div>
          </div>
        </div>

        {/* Divider */}
        <div style={{ width: 1, height: 24, background: BD, marginRight: 16, flexShrink: 0 }} />

        {/* Building category tabs */}
        <div style={{ display: 'flex', gap: 2, marginRight: 16, flexShrink: 0 }}>
          {(Object.entries(PRESETS) as [BuildingCategory, typeof PRESETS[BuildingCategory]][]).map(([cat, meta]) => {
            const Icon = meta.icon;
            const active = activeCategory === cat;
            return (
              <button
                key={cat}
                onClick={() => { setActiveCategory(cat); setConfig(p => ({ ...p, category: cat })); }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 5,
                  padding: '5px 10px', fontSize: 10, fontWeight: 600,
                  background: active ? GOLD : 'transparent',
                  color: active ? '#fff' : TX2,
                  border: active ? 'none' : `1px solid ${BD}`,
                  cursor: 'pointer', transition: 'all 0.15s',
                }}
              >
                <Icon style={{ width: 11, height: 11 }} strokeWidth={1.8} />
                <span className="hide-xs">{meta.label}</span>
              </button>
            );
          })}
        </div>

        {/* Divider */}
        <div style={{ width: 1, height: 24, background: BD, marginRight: 12, flexShrink: 0 }} />

        {/* Camera presets */}
        <div style={{ display: 'flex', gap: 2, marginRight: 8, flexShrink: 0 }}>
          {CAM_PRESETS.map(cp => (
            <button
              key={cp.label}
              onClick={() => setCamPos(cp.pos)}
              style={{
                padding: '4px 9px', fontSize: 9, fontWeight: 600, textTransform: 'uppercase',
                letterSpacing: '0.1em', color: TX2, background: 'transparent',
                border: `1px solid ${BD}`, cursor: 'pointer', transition: 'all 0.15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = GOLDB; e.currentTarget.style.color = GOLD; e.currentTarget.style.background = GOLDBG; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = BD; e.currentTarget.style.color = TX2; e.currentTarget.style.background = 'transparent'; }}
            >
              {cp.label}
            </button>
          ))}
        </div>

        {/* Location indicator */}
        {location && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginRight: 12, maxWidth: 180, overflow: 'hidden' }}>
            <MapPin style={{ width: 11, height: 11, color: GOLD, flexShrink: 0 }} strokeWidth={2} />
            <span style={{ fontSize: 10, color: TX2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {location.address}
            </span>
          </div>
        )}

        {/* Spacer */}
        <div style={{ flex: 1 }} />

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
          <button onClick={handleReset} style={toolBtn} title="Reset" onMouseEnter={e => btnEnter(e, TX3)} onMouseLeave={btnLeave}>
            <RotateCcw style={{ width: 13, height: 13 }} strokeWidth={1.8} />
          </button>
          <button onClick={downloadScreenshot} style={toolBtn} title="Download render" onMouseEnter={e => btnEnter(e, GOLD)} onMouseLeave={btnLeave}>
            <Download style={{ width: 13, height: 13 }} strokeWidth={1.8} />
          </button>
          <button onClick={() => setFullscreen(f => !f)} style={toolBtn} title="Fullscreen" onMouseEnter={e => btnEnter(e, GOLD)} onMouseLeave={btnLeave}>
            {fullscreen ? <X style={{ width: 13, height: 13 }} /> : <Maximize2 style={{ width: 13, height: 13 }} />}
          </button>
          <button
            onClick={() => setSidebarOpen(o => !o)}
            style={{ ...toolBtn, background: sidebarOpen ? GOLDBG : 'transparent', borderColor: sidebarOpen ? GOLDB : BD, color: sidebarOpen ? GOLD : TX2 }}
            title="Toggle controls"
          >
            <SlidersHorizontal style={{ width: 13, height: 13 }} />
          </button>
        </div>
      </div>

      {/* ══════════════════════════════════════════════
          MAIN BODY
      ══════════════════════════════════════════════ */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

        {/* ── LEFT SIDEBAR ── */}
        {sidebarOpen && (
          <div style={{
            width: 300, flexShrink: 0, background: CARD, borderRight: `1px solid ${BD}`,
            display: 'flex', flexDirection: 'column', overflow: 'hidden',
          }}>
            {/* Blueprint upload */}
            <div style={{ padding: '12px 14px', borderBottom: `1px solid ${BD}` }}>
              <div
                onDragOver={e => e.preventDefault()}
                onDrop={handleDrop}
                onClick={() => fileRef.current?.click()}
                style={{
                  border: `1.5px dashed ${BD}`, padding: '10px 12px',
                  cursor: 'pointer', textAlign: 'center', transition: 'all 0.15s',
                  background: BG,
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = GOLDB; (e.currentTarget as HTMLElement).style.background = GOLDBG; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = BD; (e.currentTarget as HTMLElement).style.background = BG; }}
              >
                {blueprint ? (
                  <img src={blueprint} alt="Blueprint" style={{ width: '100%', height: 80, objectFit: 'contain', opacity: 0.85 }} />
                ) : (
                  <div style={{ padding: '6px 0' }}>
                    <Upload style={{ width: 18, height: 18, color: TX3, margin: '0 auto 6px' }} strokeWidth={1.2} />
                    <div style={{ fontSize: 11, color: TX2, fontWeight: 500 }}>Drop blueprint or click to upload</div>
                    <div style={{ fontSize: 10, color: TX3, marginTop: 2 }}>PNG, JPG, PDF — AI analysis auto-extracts dimensions</div>
                  </div>
                )}
                {analyzing && (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontSize: 10, color: GOLD, marginTop: 6 }}>
                    <div style={{ width: 10, height: 10, border: `1.5px solid ${GOLD}`, borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                    Analyzing blueprint…
                  </div>
                )}
              </div>
              <input ref={fileRef} type="file" accept="image/*,.pdf" style={{ display: 'none' }}
                onChange={e => { const f = e.target.files?.[0]; if (f) handleUpload(f); }} />
            </div>

            {/* Analysis results */}
            {analysis && (
              <div style={{ padding: '10px 14px', borderBottom: `1px solid ${BD}`, background: GOLDBG }}>
                <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: GOLD, marginBottom: 8 }}>Blueprint Detected</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 8 }}>
                  {[{ l: 'Sq Ft', v: analysis.sqft.toLocaleString() }, { l: 'Stories', v: analysis.stories }, { l: 'Width', v: `${analysis.width}m` }, { l: 'Depth', v: `${analysis.depth}m` }].map(({ l, v }) => (
                    <div key={l} style={{ background: CARD, border: `1px solid ${BD}`, padding: '6px 8px', textAlign: 'center' }}>
                      <div style={{ fontSize: 8, color: TX3 }}>{l}</div>
                      <div style={{ fontSize: 12, fontWeight: 700, color: GOLD, fontVariantNumeric: 'tabular-nums' }}>{v}</div>
                    </div>
                  ))}
                </div>
                <div style={{ fontSize: 9, color: TX2 }}>Rooms: {analysis.rooms.join(', ')}</div>
              </div>
            )}

            {/* Presets for active category */}
            <div style={{ padding: '10px 14px', borderBottom: `1px solid ${BD}` }}>
              <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: TX3, marginBottom: 8 }}>
                {categoryPresets.label} Presets
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                {categoryPresets.configs.map(p => (
                  <button
                    key={p.subtype}
                    onClick={() => applyPreset({ ...p, category: activeCategory })}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '7px 10px', background: 'transparent', border: `1px solid ${BD}`,
                      cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = GOLDB; e.currentTarget.style.background = GOLDBG; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = BD; e.currentTarget.style.background = 'transparent'; }}
                  >
                    <span style={{ fontSize: 11, fontWeight: 500, color: TX1 }}>{p.subtype}</span>
                    <span style={{ fontSize: 9, color: TX3 }}>{p.stories}fl · {p.width}×{p.depth}m</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Control tabs */}
            <div style={{ display: 'flex', borderBottom: `1px solid ${BD}`, flexShrink: 0 }}>
              {PANEL_TABS.map(t => (
                <button
                  key={t.key}
                  onClick={() => setPanel(t.key)}
                  style={{
                    flex: 1, padding: '9px 4px', fontSize: 9, fontWeight: 700,
                    textTransform: 'uppercase', letterSpacing: '0.12em',
                    background: panel === t.key ? GOLDBG : 'transparent',
                    color: panel === t.key ? GOLD : TX3,
                    border: 'none', borderBottom: panel === t.key ? `2px solid ${GOLD}` : '2px solid transparent',
                    cursor: 'pointer', transition: 'all 0.15s',
                  }}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* Scrollable controls */}
            <div style={{ flex: 1, overflowY: 'auto', padding: 14 }}>

              {/* ── Structure tab ── */}
              {panel === 'build' && (
                <>
                  <CtrlSection title="Dimensions">
                    <SliderRow label="Width" value={config.width} min={8} max={100} onChange={v => set('width', v)} unit="m" />
                    <SliderRow label="Depth" value={config.depth} min={8} max={80}  onChange={v => set('depth', v)} unit="m" />
                    <SliderRow label="Stories" value={config.stories} min={1} max={50} onChange={v => set('stories', v)} />
                    <SliderRow label="Floor Height" value={config.ceilingHeight} min={2.4} max={6} step={0.1} onChange={v => set('ceilingHeight', v)} unit="m" />
                  </CtrlSection>
                  <CtrlSection title="Roof">
                    <SelectRow label="Type" value={config.roofType}
                      options={[
                        { v: 'flat', label: 'Flat / Parapet' },
                        { v: 'gabled', label: 'Gabled' },
                        { v: 'hip', label: 'Hip' },
                        { v: 'mansard', label: 'Mansard' },
                        { v: 'sawtooth', label: 'Sawtooth (Industrial)' },
                      ]}
                      onChange={v => set('roofType', v as BuildingConfig['roofType'])}
                    />
                    {config.roofType !== 'flat' && config.roofType !== 'sawtooth' && (
                      <SliderRow label="Pitch" value={config.roofPitch} min={10} max={60} onChange={v => set('roofPitch', v)} unit="°" />
                    )}
                  </CtrlSection>
                  <CtrlSection title="Windows">
                    <SliderRow label="Front" value={config.frontWindows} min={1} max={12} onChange={v => set('frontWindows', v)} />
                    <SliderRow label="Side" value={config.sideWindows} min={0} max={8}  onChange={v => set('sideWindows', v)} />
                  </CtrlSection>
                  <CtrlSection title="Features">
                    <Toggle label="Porch / Entrance Canopy" checked={config.hasPorch} onChange={v => set('hasPorch', v)} />
                    <Toggle label="Driveway" checked={config.hasDriveway} onChange={v => set('hasDriveway', v)} />
                    <Toggle label="Rooftop Equipment" checked={config.hasRooftopEquip} onChange={v => set('hasRooftopEquip', v)} />
                  </CtrlSection>
                </>
              )}

              {/* ── Materials tab ── */}
              {panel === 'style' && (
                <>
                  <CtrlSection title="Facade Material">
                    <SelectRow label="Material" value={config.wallMaterial}
                      options={[
                        { v: 'stucco',   label: 'Smooth Stucco' },
                        { v: 'brick',    label: 'Brick Masonry' },
                        { v: 'concrete', label: 'Poured Concrete' },
                        { v: 'glass',    label: 'Curtain Wall Glass' },
                        { v: 'metal',    label: 'Metal Panel' },
                        { v: 'stone',    label: 'Natural Stone' },
                        { v: 'wood',     label: 'Wood Siding' },
                      ]}
                      onChange={v => set('wallMaterial', v as BuildingConfig['wallMaterial'])}
                    />
                    <SliderRow label="Roughness" value={config.wallRoughness} min={0.02} max={1} step={0.01} onChange={v => set('wallRoughness', v)} />
                  </CtrlSection>
                  <CtrlSection title="Colors">
                    <Field label="Wall Color">
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <ColorSwatch color={config.wallColor} onChange={v => set('wallColor', v)} />
                        <span style={{ fontSize: 10, color: TX2, fontFamily: 'monospace' }}>{config.wallColor}</span>
                      </div>
                    </Field>
                    <Field label="Trim / Frame Color">
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <ColorSwatch color={config.trimColor} onChange={v => set('trimColor', v)} />
                        <span style={{ fontSize: 10, color: TX2, fontFamily: 'monospace' }}>{config.trimColor}</span>
                      </div>
                    </Field>
                    <Field label="Roof Color">
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <ColorSwatch color={config.roofColor} onChange={v => set('roofColor', v)} />
                        <span style={{ fontSize: 10, color: TX2, fontFamily: 'monospace' }}>{config.roofColor}</span>
                      </div>
                    </Field>
                    <Field label="Window Frame">
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <ColorSwatch color={config.frameColor} onChange={v => set('frameColor', v)} />
                        <span style={{ fontSize: 10, color: TX2, fontFamily: 'monospace' }}>{config.frameColor}</span>
                      </div>
                    </Field>
                  </CtrlSection>
                </>
              )}

              {/* ── Site tab ── */}
              {panel === 'site' && (
                <>
                  <CtrlSection title="Site & Amenities">
                    <SelectRow label="Landscaping" value={config.landscaping}
                      options={[
                        { v: 'lush',    label: 'Lush Garden' },
                        { v: 'minimal', label: 'Minimal / Modern' },
                        { v: 'desert',  label: 'Desert Xeriscape' },
                        { v: 'urban',   label: 'Urban / Hardscape' },
                      ]}
                      onChange={v => set('landscaping', v as BuildingConfig['landscaping'])}
                    />
                    <Toggle label="Driveway" checked={config.hasDriveway} onChange={v => set('hasDriveway', v)} />
                    <Toggle label="Pool / Water Feature" checked={config.hasPool} onChange={v => set('hasPool', v)} />
                    <Toggle label="Surface Parking Lot" checked={config.hasParking} onChange={v => set('hasParking', v)} />
                  </CtrlSection>
                  {location && (
                    <CtrlSection title="Site Context">
                      <div style={{ fontSize: 11, color: TX2, lineHeight: 1.6 }}>
                        <div><strong style={{ color: TX1 }}>Address</strong></div>
                        <div style={{ color: TX2, marginBottom: 8 }}>{location.address}</div>
                        <div><strong style={{ color: TX1 }}>Coordinates</strong></div>
                        <div style={{ fontFamily: 'monospace', fontSize: 10 }}>
                          {location.lat.toFixed(5)}°N, {location.lng.toFixed(5)}°W
                        </div>
                      </div>
                      {satTexture && (
                        <div style={{ fontSize: 10, color: GOLD, display: 'flex', alignItems: 'center', gap: 4, marginTop: 8 }}>
                          <CheckCircle2Icon />
                          Satellite imagery applied to ground plane
                        </div>
                      )}
                    </CtrlSection>
                  )}
                </>
              )}

              {/* ── Lighting tab ── */}
              {panel === 'lighting' && (
                <CtrlSection title="Time of Day">
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                    {(['dawn','morning','noon','golden','night'] as const).map(t => (
                      <button
                        key={t}
                        onClick={() => set('timeOfDay', t)}
                        style={{
                          padding: '10px 8px', textAlign: 'center', cursor: 'pointer',
                          background: config.timeOfDay === t ? GOLD : BG,
                          border: `1px solid ${config.timeOfDay === t ? GOLD : BD}`,
                          color: config.timeOfDay === t ? '#fff' : TX1,
                          fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em',
                          transition: 'all 0.15s',
                        }}
                      >
                        {t === 'dawn' ? '🌅' : t === 'morning' ? '🌤' : t === 'noon' ? '☀️' : t === 'golden' ? '🌇' : '🌙'} {t}
                      </button>
                    ))}
                  </div>
                </CtrlSection>
              )}
            </div>

            {/* Cost estimator at bottom of sidebar */}
            <CostEstimator config={config} />
          </div>
        )}

        {/* ── CENTER: 3D CANVAS ── */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div ref={canvasRef} style={{ flex: 1, position: 'relative' }}>
            <Canvas
              shadows="percentage"
              gl={{ antialias: true, preserveDrawingBuffer: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.0 }}
              camera={{ fov: 52, near: 0.5, far: 800 }}
              style={{ background: '#87CEEB' }}
            >
              <Suspense fallback={null}>
                <Scene config={config} camPos={camPos} satTexture={satTexture} />
              </Suspense>
            </Canvas>

            {/* Dimension overlay */}
            <div style={{
              position: 'absolute', bottom: 12, left: 12,
              background: 'rgba(255,255,255,0.92)', border: `1px solid ${BD}`,
              padding: '8px 12px', backdropFilter: 'blur(8px)', pointerEvents: 'none',
            }}>
              <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: TX3, marginBottom: 5 }}>
                {config.subtype || config.category}
              </div>
              <div style={{ display: 'flex', gap: 12 }}>
                {[
                  { l: 'W', v: `${config.width}m` },
                  { l: 'D', v: `${config.depth}m` },
                  { l: 'H', v: `${(config.stories * config.ceilingHeight).toFixed(1)}m` },
                  { l: 'FL', v: config.stories },
                  { l: 'SF', v: `${Math.round(config.width * config.depth * config.stories * 10.764).toLocaleString()}` },
                ].map(d => (
                  <div key={d.l} style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 8, color: TX3 }}>{d.l}</div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: TX1, fontVariantNumeric: 'tabular-nums' }}>{d.v}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Location badge */}
            {location && (
              <div style={{
                position: 'absolute', top: 12, right: 12,
                background: 'rgba(255,255,255,0.92)', border: `1px solid ${GOLDB}`,
                padding: '6px 10px', backdropFilter: 'blur(8px)',
                display: 'flex', alignItems: 'center', gap: 6, pointerEvents: 'none', maxWidth: 260,
              }}>
                <MapPin style={{ width: 11, height: 11, color: GOLD, flexShrink: 0 }} strokeWidth={2} />
                <span style={{ fontSize: 9, color: TX1, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {location.address}
                </span>
                {satTexture && (
                  <span style={{ fontSize: 8, color: GOLD, fontWeight: 700, letterSpacing: '0.1em', flexShrink: 0 }}>· SAT</span>
                )}
              </div>
            )}

            {/* Controls hint */}
            <div style={{
              position: 'absolute', bottom: 12, right: 12, fontSize: 9, color: 'rgba(0,0,0,0.38)',
              pointerEvents: 'none', textAlign: 'right', lineHeight: 1.7,
            }}>
              Drag to orbit · Scroll to zoom · Right-drag to pan
            </div>
          </div>

          {/* ── MAP PANEL (bottom) ── */}
          <MapPanel
            location={location}
            onSetLocation={setLocation}
            collapsed={mapCollapsed}
            onToggle={() => setMapCollapsed(c => !c)}
          />
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        .hide-xs { display: inline; }
        @media (max-width: 640px) { .hide-xs { display: none; } }
        input[type=range]::-webkit-slider-thumb {
          -webkit-appearance: none;
          width: 14px; height: 14px;
          background: ${GOLD}; border-radius: 50%; cursor: pointer;
          border: 2px solid white; box-shadow: 0 1px 3px rgba(0,0,0,0.2);
        }
        input[type=range]::-webkit-slider-track {
          height: 4px; background: ${BD}; border-radius: 2px;
        }
        input[type=range]::-moz-range-thumb {
          width: 14px; height: 14px;
          background: ${GOLD}; border-radius: 50%; cursor: pointer;
          border: 2px solid white;
        }
        .mapboxgl-ctrl-bottom-right { bottom: 8px !important; right: 8px !important; }
      `}</style>
    </div>
  );
}

/* ── Tiny icon helper ─────────────────────────────────────────────── */
function CheckCircle2Icon() {
  return <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={GREEN} strokeWidth="2.5"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>;
}

/* ── Toolbar button styles ────────────────────────────────────────── */
const toolBtn: React.CSSProperties = {
  width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center',
  background: 'transparent', border: `1px solid ${BD}`, color: TX2, cursor: 'pointer', transition: 'all 0.15s',
};
const btnEnter = (e: React.MouseEvent, color: string) => {
  const el = e.currentTarget as HTMLElement;
  el.style.color = color; el.style.borderColor = color + '40'; el.style.background = color + '10';
};
const btnLeave = (e: React.MouseEvent) => {
  const el = e.currentTarget as HTMLElement;
  el.style.color = TX2; el.style.borderColor = BD; el.style.background = 'transparent';
};
