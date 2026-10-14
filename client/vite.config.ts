import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

// Every production build gets a unique id. It's compiled into the app and also
// written to /version.json, so an open tab can notice a newer release and
// reload (see components/UpdateWatcher.tsx). Dev builds use 'dev' and never poll.
function buildVersion(id: string): Plugin {
  return {
    name: 'trakcode-build-version',
    apply: 'build',
    generateBundle() {
      this.emitFile({ type: 'asset', fileName: 'version.json', source: JSON.stringify({ id }) });
    },
  };
}

export default defineConfig(({ command }) => {
  const buildId = command === 'build' ? Date.now().toString(36) : 'dev';
  return {
    plugins: [react(), buildVersion(buildId)],
    define: { __BUILD_ID__: JSON.stringify(buildId) },
    server: {
      port: 5173,
    },
  };
});
