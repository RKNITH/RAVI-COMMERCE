import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// Export the configuration
export default defineConfig(({ mode }) => {
  // Load environment variables based on the current mode
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [react()],
    server: {
      proxy: {
        '/api': {
          target: env.VITE_API_URL, // Use the loaded environment variable
          changeOrigin: true,
          secure: false,
        },
      },
    },
  };
});
