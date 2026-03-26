import { db, swarmAgentsTable } from '@workspace/db';
import { eq, and } from 'drizzle-orm';
import { sandboxService } from './sandboxService.js';

export type SynthesisResult = {
    swarmId: string;
    leaderAgentId: string;
    contributions: Array<{ agentId: string; role: string; output: string; safe: boolean }>;
    finalSummary: string;
    totalCostUsd: number;
    violationsFound: number;
};

export class SynthesisService {
    async synthesize(swarmId: string, leaderAgentId: string): Promise<SynthesisResult> {
        const agents = await db
            .select()
            .from(swarmAgentsTable)
            .where(and(eq(swarmAgentsTable.swarmRunId, swarmId), eq(swarmAgentsTable.status, 'completed')));

        let violationsFound = 0;
        const contributions = agents.map((a) => {
            const raw = typeof a.output === 'string' ? a.output : JSON.stringify(a.output ?? '');
            const { sanitized, safe, violations } = sandboxService.process(raw);
            violationsFound += violations.length;
            return { agentId: a.id, role: a.role, output: sanitized, safe };
        });

        const totalCostUsd = agents.reduce((sum, a) => sum + (a.costUsd ?? 0), 0);
        const finalSummary = contributions.map((c) => `[${c.role}]: ${c.output}`).join('\n');

        return { swarmId, leaderAgentId, contributions, finalSummary, totalCostUsd, violationsFound };
    }
}

export const synthesisService = new SynthesisService();
