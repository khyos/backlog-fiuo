export type ServerLogLevel = 'error';

export type ServerLogEntry = {
    id: number;
    timestamp: string;
    level: ServerLogLevel;
    message: string;
};

const MAX_LOG_ENTRIES = 5000;
const entries: ServerLogEntry[] = [];
let nextId = 1;
let installed = false;

function formatArgument(argument: unknown): string {
    if (typeof argument === 'string') return argument;
    if (argument instanceof Error) return argument.stack || argument.message;

    try {
        return JSON.stringify(argument) ?? String(argument);
    } catch {
        return String(argument);
    }
}

function installConsoleCapture(): void {
    if (installed) return;
    installed = true;

    const original = console.error.bind(console);
    console.error = (...arguments_: unknown[]) => {
        entries.push({
            id: nextId++,
            timestamp: new Date().toISOString(),
            level: 'error',
            message: arguments_.map(formatArgument).join(' ')
        });

        if (entries.length > MAX_LOG_ENTRIES) {
            entries.splice(0, entries.length - MAX_LOG_ENTRIES);
        }

        original(...arguments_);
    };
}

installConsoleCapture();

export function getServerLogs(): ServerLogEntry[] {
    return entries.slice().reverse();
}