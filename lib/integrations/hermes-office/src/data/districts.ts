export type DistrictName =
  | 'hearthworks'
  | 'stacks'
  | 'thresholds'
  | 'courier-lanes'
  | 'chorus'
  | 'observatory'
  | 'repair-yard';

export type ArtifactType =
  | 'patch-card'
  | 'result-card'
  | 'memory-crate'
  | 'approval-gate'
  | 'maintenance-capsule';

export interface DistrictDefinition {
  id: DistrictName;
  displayName: string;
  species: string;
  logic: string;
  mood: string;
  defaultMaxPets: number;
  backgroundPalette: string[];
  supportedArtifacts: ArtifactType[];
}

export const DEFAULT_DISTRICTS: DistrictDefinition[] = [
  {
    id: 'hearthworks',
    displayName: 'The Hearthworks',
    species: 'Frygars',
    logic: 'forges, terminals, build kilns, patch anvils, model furnaces',
    mood: 'industrious warmth',
    defaultMaxPets: 8,
    backgroundPalette: ['#2C3E50', '#34495E', '#7F8C8D', '#95A5A6'],
    supportedArtifacts: ['patch-card', 'result-card'],
  },
  {
    id: 'stacks',
    displayName: 'The Stacks',
    species: 'Archivins',
    logic: 'scroll racks, shelf towers, jars, ledgers, snapshot vaults',
    mood: 'hushed memory density',
    defaultMaxPets: 6,
    backgroundPalette: ['#1B2631', '#2C3E50', '#5D6D7E', '#85929E'],
    supportedArtifacts: ['memory-crate', 'result-card'],
  },
  {
    id: 'thresholds',
    displayName: 'The Thresholds',
    species: 'Vesperns',
    logic: 'gates, seals, locks, sigils, approval arches',
    mood: 'quiet vigilance',
    defaultMaxPets: 4,
    backgroundPalette: ['#1C2833', '#2E4053', '#566573', '#7E5109'],
    supportedArtifacts: ['approval-gate'],
  },
  {
    id: 'courier-lanes',
    displayName: 'Courier Lanes',
    species: 'Runners',
    logic: 'tracks, lifts, chutes, dispatch posts, parcel bridges',
    mood: 'visible momentum',
    defaultMaxPets: 10,
    backgroundPalette: ['#1A5276', '#2471A3', '#5DADE2', '#85C1E9'],
    supportedArtifacts: ['result-card'],
  },
  {
    id: 'chorus',
    displayName: 'The Chorus',
    species: 'Syllari',
    logic: 'echo wells, speaker spires, chat windows, translation kiosks',
    mood: 'lively conversation',
    defaultMaxPets: 8,
    backgroundPalette: ['#4A235A', '#6C3483', '#A569BD', '#D2B4DE'],
    supportedArtifacts: ['result-card', 'memory-crate'],
  },
  {
    id: 'observatory',
    displayName: 'The Observatory',
    species: 'Olyms',
    logic: 'lenses, charts, scoreboards, route maps, prediction chambers',
    mood: 'focused interpretation',
    defaultMaxPets: 5,
    backgroundPalette: ['#0B5345', '#117A65', '#45B39D', '#A3E4D7'],
    supportedArtifacts: ['result-card', 'patch-card'],
  },
  {
    id: 'repair-yard',
    displayName: 'Repair Yard',
    species: 'Menders',
    logic: 'bench tools, spare parts, cleanup carts, stitch lights',
    mood: 'capable recovery',
    defaultMaxPets: 6,
    backgroundPalette: ['#7B241C', '#922B21', '#CB4335', '#EC7063'],
    supportedArtifacts: ['maintenance-capsule', 'patch-card'],
  },
];
