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

    console.log('🚀 Starting hyper‑swarm sprint...');
    // 1️⃣ Propose
    const proposeResult = await swarmEngine.proposeSwarm(
        companyId,
        goalId,
        leaderAgentId,
        taskDescription,
    );
    console.log(
        '✅ Proposed swarm:',
        proposeResult.swarmId,
        `phase=${proposeResult.phase}`,
        `estimatedCostUsd=${proposeResult.estimatedCostUsd}`,
    );

    // 2️⃣ Approve (auto‑approve for hyper‑swarm)
    if (proposeResult.needsApproval) {
        const approveResult = await swarmEngine.approveSwarm(
            proposeResult.swarmId,
            leaderAgentId,
        );
        console.log(
            '✅ Approved swarm:',
            approveResult.swarmId,
            `phase=${approveResult.phase}`,
            `approvedBy=${approveResult.approvedBy}`,
        );
    } else {
        console.log('✅ Approval skipped: swarm is already pending execution.');
    }

    // 3️⃣ Spawn
    const spawnResult = await swarmEngine.spawnSwarm(proposeResult.swarmId);
    console.log('✅ Spawned agents:', spawnResult.agentCount);

    // 4️⃣ Execute (parallel execution handled inside SwarmEngine)
    const execResult = await swarmEngine.executeSwarm(proposeResult.swarmId);
    console.log('✅ Execution completed. Agents run:', execResult.agentCount);

    // 5️⃣ Synthesize
    const synthResult = await swarmEngine.synthesizeSwarm(proposeResult.swarmId);
    console.log('✅ Synthesis result summary:', synthResult.synthesisResult.finalSummary);

    // 6️⃣ Dissolve
    const dissolveResult = await swarmEngine.dissolveSwarm(proposeResult.swarmId);
    console.log('✅ Swarm dissolved. Final phase:', dissolveResult.phase);
}

runHyperSwarm().catch((err) => {
    console.error('❌ Hyper‑swarm failed:', err);
    process.exit(1);
});
