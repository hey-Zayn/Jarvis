// vite.config.ts
import { defineConfig } from "file:///C:/Users/Zayno/Desktop/Backend/Jarvis/apps/web-app/node_modules/vite/dist/node/index.js";
import react from "file:///C:/Users/Zayno/Desktop/Backend/Jarvis/apps/web-app/node_modules/@vitejs/plugin-react/dist/index.js";
import tailwindcss from "file:///C:/Users/Zayno/Desktop/Backend/Jarvis/apps/web-app/node_modules/@tailwindcss/vite/dist/index.mjs";
import path from "path";
var __vite_injected_original_dirname = "C:\\Users\\Zayno\\Desktop\\Backend\\Jarvis\\apps\\web-app";
var vite_config_default = defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__vite_injected_original_dirname, "./src"),
      "@jarvis/shared": path.resolve(__vite_injected_original_dirname, "../../packages/shared/src")
    }
  },
  optimizeDeps: {
    include: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime"]
  },
  server: {
    port: 3e3,
    proxy: {
      "/api": "http://localhost:5000",
      "/auth": "http://localhost:5000",
      "/agent": "http://localhost:5000",
      "/worker": "http://localhost:5000"
    }
  },
  build: { outDir: "dist", sourcemap: true }
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJDOlxcXFxVc2Vyc1xcXFxaYXlub1xcXFxEZXNrdG9wXFxcXEJhY2tlbmRcXFxcSmFydmlzXFxcXGFwcHNcXFxcd2ViLWFwcFwiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9maWxlbmFtZSA9IFwiQzpcXFxcVXNlcnNcXFxcWmF5bm9cXFxcRGVza3RvcFxcXFxCYWNrZW5kXFxcXEphcnZpc1xcXFxhcHBzXFxcXHdlYi1hcHBcXFxcdml0ZS5jb25maWcudHNcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfaW1wb3J0X21ldGFfdXJsID0gXCJmaWxlOi8vL0M6L1VzZXJzL1pheW5vL0Rlc2t0b3AvQmFja2VuZC9KYXJ2aXMvYXBwcy93ZWItYXBwL3ZpdGUuY29uZmlnLnRzXCI7aW1wb3J0IHsgZGVmaW5lQ29uZmlnIH0gZnJvbSAndml0ZSc7XG5pbXBvcnQgcmVhY3QgZnJvbSAnQHZpdGVqcy9wbHVnaW4tcmVhY3QnO1xuaW1wb3J0IHRhaWx3aW5kY3NzIGZyb20gJ0B0YWlsd2luZGNzcy92aXRlJztcbmltcG9ydCBwYXRoIGZyb20gJ3BhdGgnO1xuXG5leHBvcnQgZGVmYXVsdCBkZWZpbmVDb25maWcoe1xuICBwbHVnaW5zOiBbcmVhY3QoKSwgdGFpbHdpbmRjc3MoKV0sXG4gIHJlc29sdmU6IHtcbiAgICBhbGlhczoge1xuICAgICAgJ0AnOiBwYXRoLnJlc29sdmUoX19kaXJuYW1lLCAnLi9zcmMnKSxcbiAgICAgICdAamFydmlzL3NoYXJlZCc6IHBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsICcuLi8uLi9wYWNrYWdlcy9zaGFyZWQvc3JjJyksXG4gICAgfSxcbiAgfSxcbiAgb3B0aW1pemVEZXBzOiB7XG4gICAgaW5jbHVkZTogWydyZWFjdCcsICdyZWFjdC1kb20nLCAncmVhY3QvanN4LXJ1bnRpbWUnLCAncmVhY3QvanN4LWRldi1ydW50aW1lJ10sXG4gIH0sXG4gIHNlcnZlcjoge1xuICAgIHBvcnQ6IDMwMDAsXG4gICAgcHJveHk6IHtcbiAgICAgICcvYXBpJzogJ2h0dHA6Ly9sb2NhbGhvc3Q6NTAwMCcsXG4gICAgICAnL2F1dGgnOiAnaHR0cDovL2xvY2FsaG9zdDo1MDAwJyxcbiAgICAgICcvYWdlbnQnOiAnaHR0cDovL2xvY2FsaG9zdDo1MDAwJyxcbiAgICAgICcvd29ya2VyJzogJ2h0dHA6Ly9sb2NhbGhvc3Q6NTAwMCcsXG4gICAgfSxcbiAgfSxcbiAgYnVpbGQ6IHsgb3V0RGlyOiAnZGlzdCcsIHNvdXJjZW1hcDogdHJ1ZSB9LFxufSk7Il0sCiAgIm1hcHBpbmdzIjogIjtBQUF3VixTQUFTLG9CQUFvQjtBQUNyWCxPQUFPLFdBQVc7QUFDbEIsT0FBTyxpQkFBaUI7QUFDeEIsT0FBTyxVQUFVO0FBSGpCLElBQU0sbUNBQW1DO0FBS3pDLElBQU8sc0JBQVEsYUFBYTtBQUFBLEVBQzFCLFNBQVMsQ0FBQyxNQUFNLEdBQUcsWUFBWSxDQUFDO0FBQUEsRUFDaEMsU0FBUztBQUFBLElBQ1AsT0FBTztBQUFBLE1BQ0wsS0FBSyxLQUFLLFFBQVEsa0NBQVcsT0FBTztBQUFBLE1BQ3BDLGtCQUFrQixLQUFLLFFBQVEsa0NBQVcsMkJBQTJCO0FBQUEsSUFDdkU7QUFBQSxFQUNGO0FBQUEsRUFDQSxjQUFjO0FBQUEsSUFDWixTQUFTLENBQUMsU0FBUyxhQUFhLHFCQUFxQix1QkFBdUI7QUFBQSxFQUM5RTtBQUFBLEVBQ0EsUUFBUTtBQUFBLElBQ04sTUFBTTtBQUFBLElBQ04sT0FBTztBQUFBLE1BQ0wsUUFBUTtBQUFBLE1BQ1IsU0FBUztBQUFBLE1BQ1QsVUFBVTtBQUFBLE1BQ1YsV0FBVztBQUFBLElBQ2I7QUFBQSxFQUNGO0FBQUEsRUFDQSxPQUFPLEVBQUUsUUFBUSxRQUFRLFdBQVcsS0FBSztBQUMzQyxDQUFDOyIsCiAgIm5hbWVzIjogW10KfQo=
