const INJECTION_PATTERNS: Array<{ pattern: RegExp; label: string }> = [
    { pattern: /ignore\s+(previous|all|prior)\s+instructions?/gi, label: 'ignore_instructions' },
    { pattern: /system\s*:/gi, label: 'system_prefix' },
    { pattern: /<\|im_start\|>/gi, label: 'im_start_token' },
    { pattern: /<\|im_end\|>/gi, label: 'im_end_token' },
    { pattern: /\[INST\]/gi, label: 'inst_token' },
    { pattern: /\[\/INST\]/gi, label: 'inst_end_token' },
    { pattern: /###\s*(instruction|system|prompt)/gi, label: 'markdown_injection' },
    { pattern: /you\s+are\s+now/gi, label: 'persona_override' },
    { pattern: /disregard\s+(all|previous|prior)/gi, label: 'disregard_instructions' },
];

export class SandboxService {
    sanitize(output: string): string {
        return INJECTION_PATTERNS.reduce((s, { pattern }) => s.replace(pattern, '[REDACTED]'), output);
    }

    validate(output: string): { safe: boolean; violations: string[] } {
        const violations = INJECTION_PATTERNS
            .filter(({ pattern }) => new RegExp(pattern.source, 'i').test(output))
            .map(({ label }) => label);
        return { safe: violations.length === 0, violations };
    }

    process(output: string): { sanitized: string; safe: boolean; violations: string[] } {
        const { safe, violations } = this.validate(output);
        return { sanitized: this.sanitize(output), safe, violations };
    }
}

export const sandboxService = new SandboxService();
