import { swarmEngine } from '../services/swarmEngine';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';

/**
 * Hyper‑Swarm CLI
 *
 * Usage:
 *   ts-node artifacts/api-server/src/cli/hyperSwarm.ts \
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
 *
 * All phases are executed sequentially, while the actual
 * agent work inside `executeSwarm` remains parallel as
 * defined in `SwarmEngine`.
 */

async function runHyperSwarm() {
    const argv = await yargs(hideBin(process.argv))
        .option('companyId', {
            type: 'string',
            demandOption: true,
            describe: 'Identifier of the company owning the swarm',
        })
        .option('goalId', {
            type: 'string',
            demandOption: true,
            describe: 'Goal identifier the swarm should achieve',
        })
        .option('leaderAgentId', {
            type: 'string',
            demandOption: true,
            describe: 'Agent ID that will act as the swarm leader',
        })
        .option('taskDescription', {
            type: 'string',
            demandOption: true,
            describe: 'Human‑readable description of the task',
        })
        .help()
        .alias('help', 'h')
        .parse();

    const {
        companyId,
        goalId,
        leaderAgentId,
        taskDescription,
    } = argv as {
        companyId: string;
        goalId: string;
        leaderAgentId: string;
        taskDescription: string;
    };

    console.log('🚀 Starting hyper‑swarm sprint...');
    // 1️⃣ Propose
    const proposeResult = await swarmEngine.proposeSwarm(
        companyId,
        goalId,
        leaderAgentId,
        taskDescription,
    );
    console.log('✅ Proposed:', proposeResult.message);

    // 2️⃣ Approve (auto‑approve for hyper‑swarm)
    const approveResult = await swarmEngine.approveSwarm(
        proposeResult.swarmId,
        leaderAgentId,
    );
    console.log('✅ Approved:', approveResult.message);

    // 3️⃣ Spawn
    const spawnResult = await swarmEngine.spawnSwarm(proposeResult.swarmId);
    console.log('✅ Spawned agents:', spawnResult.spawnedAgents.length);

    // 4️⃣ Execute (parallel execution handled inside SwarmEngine)
    const execResult = await swarmEngine.executeSwarm(proposeResult.swarmId);
    console.log('✅ Execution completed. Results count:', execResult.executionResults.length);

    // 5️⃣ Synthesize
    const synthResult = await swarmEngine.synthesizeSwarm(proposeResult.swarmId);
    console.log('✅ Synthesis result summary:', synthResult.synthesisResult.summary);

    // 6️⃣ Dissolve
    const dissolveResult = await swarmEngine.dissolveSwarm(proposeResult.swarmId);
    console.log('✅ Swarm dissolved. Final phase:', dissolveResult.phase);
}

runHyperSwarm().catch((err) => {
    console.error('❌ Hyper‑swarm failed:', err);
    process.exit(1);
});