import type { PluginOption } from 'vite';
export default function createVitePlugins(viteEnv: Record<string, string>, isBuild?: boolean): Promise<(PluginOption | PluginOption[])[]>;
