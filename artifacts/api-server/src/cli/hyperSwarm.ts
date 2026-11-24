import { swarmEngine } from '../services/swarmEngine';

/**
 * Hyper‑Swarm CLI
 *
 * Usage:
 *   tsx artifacts/api-server/src/cli/hyperSwarm.ts \
 *     --companyId <companyId> \
 *     --goalId <goalId> \
 *     --leaderAgentId <leaderAgentId> \
 *     --taskDescription "<description>"
 *
 * This command runs a full swarm lifecycle automatically:
 *   1️⃣ proposeSwarm
 *   2️⃣ approveSwarm (auto‑approved)
 *   3️⃣ spawnSwarm
 *   4️⃣ executeSwarm (agents run in parallel)
 *   5️⃣ synthesizeSwarm
 *   6️⃣ dissolveSwarm
 */

function parseArgs(): Record<string, string> {
    const args: Record<string, string> = {};
    const raw = process.argv.slice(2);
    for (let i = 0; i < raw.length; i++) {
        if (raw[i].startsWith('--')) {
            const key = raw[i].slice(2);
            const val = raw[i + 1] && !raw[i + 1].startsWith('--') ? raw[++i] : 'true';
            args[key] = val;
        }
    }
    return args;
}

async function runHyperSwarm() {
    const argv = parseArgs();
    const required = ['companyId', 'goalId', 'leaderAgentId', 'taskDescription'] as const;
    for (const key of required) {
        if (!argv[key]) {
            console.error(`❌ Missing required argument: --${key}`);
            process.exit(2);
        }
    }

    const { companyId, goalId, leaderAgentId, taskDescription } = argv as Record<typeof required[number], string>;
    // 1️⃣ Propose
    const proposeResult = await swarmEngine.proposeSwarm(
        companyId,
        goalId,
        leaderAgentId,
        taskDescription,
    );

    // 2️⃣ Approve (auto‑approve for hyper‑swarm)
    const _approveResult = await swarmEngine.approveSwarm(
        proposeResult.swarmId,
        leaderAgentId,
    );

    // 3️⃣ Spawn
    const _spawnResult = await swarmEngine.spawnSwarm(proposeResult.swarmId);

    // 4️⃣ Execute (parallel execution handled inside SwarmEngine)
    const _execResult = await swarmEngine.executeSwarm(proposeResult.swarmId);

    // 5️⃣ Synthesize
    const _synthResult = await swarmEngine.synthesizeSwarm(proposeResult.swarmId);

    // 6️⃣ Dissolve
    const _dissolveResult = await swarmEngine.dissolveSwarm(proposeResult.swarmId);
}

runHyperSwarm().catch((err) => {
    console.error('❌ Hyper‑swarm failed:', err);
    process.exit(1);
});
