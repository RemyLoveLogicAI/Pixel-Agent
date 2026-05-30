import { PetCanvas } from "./PetCanvas.js";

// ── Types ────────────────────────────────────────────────────────────────────

interface EyeRegion {
  leftEyeColumns: number[];
  rightEyeColumns: number[];
  eyeRows: number[];
  leftSparkle: [number, number];
  rightSparkle: [number, number];
}

interface RpetPet {
  id: string;
  displayName: string;
  palette: Record<string, string>;
  eyeRegion: EyeRegion;
  frames: Record<string, string[][]>;
  timing?: Record<string, { frameDuration?: number; loop?: boolean }>;
}

interface QueueItem {
  name: string;
  desc: string;
  tag: string;
}

interface DistrictScene {
  label: string;
  state: string;
  district: string;
  lineage: string;
  permission: string;
  job: string;
  queue: string;
  role: string;
  species: string;
  speechMeta: string;
  speech: string;
  artifactTitle: string;
  artifactCopy: string;
  artifactSignal: string;
  artifactObject: string;
  scene: string;
  tags: string[];
  artifactTags: string[];
  queueItems: QueueItem[];
}

// ── Default scenarios ────────────────────────────────────────────────────────

const SCENARIOS: Record<string, DistrictScene> = {
  build: {
    label: "Build Mode", state: "talking", district: "The Hearthworks",
    lineage: "openai lineage", permission: "assistant", job: "forge code", queue: "3 active",
    role: "forge active", species: "Frygar / builder caste",
    speechMeta: "Frygar / Builder-Smith",
    speech: "Patch alloy is warm. Give me eight seconds and I will bring the result card back clean.",
    artifactTitle: "Patch Card", artifactCopy: "The patch is a physical card moving through the forge line.",
    artifactSignal: "thinking cyan", artifactObject: "patch-card", scene: "build",
    tags: ["files -> cards", "build district", "visible labor"],
    artifactTags: ["copper edge", "queued by runner", "cooling rail"],
    queueItems: [
      { name: "Patch alloy", desc: "Frygar is tempering a code card.", tag: "in forge" },
      { name: "Log shard", desc: "Archivins are indexing the build trail.", tag: "handoff" },
      { name: "Approval seal", desc: "Vesperns will gate release.", tag: "waiting" },
    ],
  },
  deliver: {
    label: "Return Result", state: "happy", district: "Courier Lanes",
    lineage: "openai lineage", permission: "assistant", job: "return result", queue: "2 active",
    role: "handoff clear", species: "Frygar / builder caste",
    speechMeta: "Frygar / Result Courier Handoff",
    speech: "Clean return. The result card is stamped, cooled, and ready to route upstream.",
    artifactTitle: "Result Card", artifactCopy: "Finished work should feel collectible and inspectable.",
    artifactSignal: "success amber", artifactObject: "result-card", scene: "patch",
    tags: ["result token", "success state", "route visibility"],
    artifactTags: ["amber seal", "delivery rail", "ready for review"],
    queueItems: [
      { name: "Result card", desc: "Runner lane is moving the finished output.", tag: "delivering" },
      { name: "Memory ledger", desc: "Archivins are attaching the final summary.", tag: "annotating" },
      { name: "Idle forge", desc: "The Hearthworks cool briefly.", tag: "ready" },
    ],
  },
  inspect: {
    label: "Inspect Artifact", state: "lookLeft", district: "The Stacks",
    lineage: "anthropic lineage", permission: "observer", job: "inspect memory", queue: "4 active",
    role: "reading trace", species: "Frygar / archived diagnostic pass",
    speechMeta: "Frygar / Cross-District Inspection",
    speech: "This card carries its own scorch history. I am reading where the first failure entered.",
    artifactTitle: "Memory Crate", artifactCopy: "Inspection mode shifts the scene from execution to interpretation.",
    artifactSignal: "memory violet", artifactObject: "memory-crate", scene: "inspect",
    tags: ["glyph ancestry", "archive object", "quiet read"],
    artifactTags: ["ledger hooks", "trace fragments", "violet recall"],
    queueItems: [
      { name: "Memory crate", desc: "Context fragments being unpacked by Archivins.", tag: "open" },
      { name: "Build ash", desc: "Frygar compares scorch residue.", tag: "scanning" },
      { name: "Route map", desc: "Olyms are scoring probable causes.", tag: "forecasting" },
    ],
  },
  alert: {
    label: "Raise Alert", state: "alert", district: "The Thresholds",
    lineage: "gemini lineage", permission: "agent", job: "gate escalation", queue: "6 active",
    role: "threshold hot", species: "Frygar / escalation escort",
    speechMeta: "Frygar / Escalation Signal",
    speech: "Threshold is hot. Vesperns are holding the seal while I keep the build contained.",
    artifactTitle: "Approval Gate", artifactCopy: "Alert mode shifts district, object, and professional responsibility into containment.",
    artifactSignal: "alert magenta-red", artifactObject: "approval-gate", scene: "alert",
    tags: ["real pressure", "gate logic", "permissions visible"],
    artifactTags: ["sealed threshold", "guardian hold", "agent mode"],
    queueItems: [
      { name: "Gate seal", desc: "Vesperns have closed the threshold.", tag: "locked" },
      { name: "Active forge", desc: "Frygar is holding a patch mid-cycle.", tag: "contained" },
      { name: "Escalation tube", desc: "A high-trust route is open.", tag: "armed" },
    ],
  },
  rest: {
    label: "Cool Down", state: "sleeping", district: "Repair Yard",
    lineage: "local / open-source", permission: "observer", job: "cooldown cycle", queue: "1 active",
    role: "cooling loop", species: "Frygar / maintenance lull",
    speechMeta: "Frygar / Rest Window",
    speech: "Forge dimmed. Let the vents breathe. Menders are stitching the small cracks.",
    artifactTitle: "Maintenance Capsule", artifactCopy: "Long-session overlays need quiet states that still feel alive.",
    artifactSignal: "queued lime", artifactObject: "maintenance-capsule", scene: "rest",
    tags: ["low-noise mode", "maintenance visible", "pleasant idle"],
    artifactTags: ["cool vent", "repair stitch", "background care"],
    queueItems: [
      { name: "Maintenance capsule", desc: "Menders are checking seams and cooling.", tag: "active" },
      { name: "Quiet lane", desc: "Only low-priority work is moving.", tag: "low traffic" },
      { name: "Standby token", desc: "Rupert can wake the district immediately.", tag: "ready" },
    ],
  },
};

// ── Component ────────────────────────────────────────────────────────────────

interface DistrictSceneViewProps {
  pet: RpetPet | null;
  scenarioKey?: string;
  onScenarioChange?: (key: string) => void;
}

export function DistrictSceneView({ pet, scenarioKey = "build", onScenarioChange }: DistrictSceneViewProps) {
  const scene = SCENARIOS[scenarioKey] || SCENARIOS.build;

  return (
    <div className="min-h-screen bg-gray-950 text-white p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="text-xs uppercase tracking-widest text-gray-500 mb-1">
            Pixel HQ Scene Preview
          </div>
          <h1 className="text-3xl font-bold mb-2">
            From Pet Viewer to Living Operator Overlay
          </h1>
          <p className="text-gray-400 text-sm max-w-2xl">
            Glyphy Pets as spatial overlays for Pixel-Agent operations. Each scenario
            maps agent work to a district, scene, and artifact.
          </p>
        </div>

        {/* Scenario buttons */}
        <div className="flex flex-wrap gap-2 mb-8">
          {Object.entries(SCENARIOS).map(([key, s]) => (
            <button
              key={key}
              onClick={() => onScenarioChange?.(key)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                key === scenarioKey
                  ? "bg-indigo-600 text-white"
                  : "bg-gray-800 text-gray-300 hover:bg-gray-700"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Stage */}
          <div className="lg:col-span-2">
            <div className={`bg-gray-900 rounded-2xl p-6 ${scenarioKey === "alert" ? "ring-2 ring-red-500/30" : ""}`}>
              {/* HUD */}
              <div className="flex items-center gap-4 mb-6 text-xs text-gray-400">
                <span className="bg-gray-800 px-3 py-1 rounded-full">
                  district: <span className="text-white">{scene.district}</span>
                </span>
                <span>{scene.lineage}</span>
                <span>{scene.permission}</span>
                <span>{scene.job}</span>
                <span>{scene.queue}</span>
              </div>

              {/* Pet canvas */}
              <div className="flex justify-center mb-6">
                <div className={`p-4 rounded-xl bg-gray-800 ${scenarioKey === "alert" ? "shadow-[0_0_30px_rgba(226,85,99,0.3)]" : ""}`}>
                  <PetCanvas pet={pet} state={scene.state} canvasSize={256} />
                </div>
              </div>

              {/* Speech bubble */}
              <div className="bg-gray-800/60 rounded-xl p-4 mb-4">
                <div className="text-xs text-indigo-400 mb-1">{scene.speechMeta}</div>
                <p className="text-sm text-gray-300 italic">&ldquo;{scene.speech}&rdquo;</p>
              </div>

              {/* Species info */}
              <div className="flex gap-4 text-xs text-gray-500">
                <span>Species: <span className="text-gray-300">{scene.species}</span></span>
                <span>State: <span className="text-indigo-400">{scene.state}</span></span>
                <span>Scene: <span className="text-gray-300">{scene.scene}</span></span>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {/* Artifact card */}
            <div className="bg-gray-900 rounded-2xl p-5">
              <div className="text-sm font-semibold text-white mb-1">{scene.artifactTitle}</div>
              <p className="text-xs text-gray-400 mb-3">{scene.artifactCopy}</p>
              <div className="text-xs text-gray-500 mb-2">
                Signal: <span className="text-white">{scene.artifactSignal}</span>
              </div>
              <div className="text-xs text-gray-500 mb-3">
                Object: <span className="text-white">{scene.artifactObject}</span>
              </div>
              <div className="flex flex-wrap gap-1">
                {scene.artifactTags.map((tag) => (
                  <span key={tag} className="bg-gray-800 text-gray-300 text-[10px] px-2 py-0.5 rounded-full">
                    {tag}
                  </span>
                ))}
              </div>
            </div>

            {/* Scene tags */}
            <div className="bg-gray-900 rounded-2xl p-5">
              <div className="text-sm font-semibold text-white mb-3">Scene Tags</div>
              <div className="flex flex-wrap gap-1">
                {scene.tags.map((tag) => (
                  <span key={tag} className="bg-indigo-900/40 text-indigo-300 text-[10px] px-2 py-0.5 rounded-full">
                    {tag}
                  </span>
                ))}
              </div>
            </div>

            {/* Queue */}
            <div className="bg-gray-900 rounded-2xl p-5">
              <div className="text-sm font-semibold text-white mb-3">Active Queue</div>
              <div className="space-y-3">
                {scene.queueItems.map((item) => (
                  <div key={item.name} className="border-b border-gray-800 pb-2 last:border-0 last:pb-0">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-white">{item.name}</span>
                      <span className="text-[10px] bg-gray-800 text-gray-400 px-2 py-0.5 rounded">
                        {item.tag}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">{item.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default DistrictSceneView;
