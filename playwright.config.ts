import { defineConfig } from '@playwright/test';
export default defineConfig({
 testDir:'./tests',fullyParallel:false,workers:1,retries:0,
 use:{baseURL:'http://127.0.0.1:3100',headless:true,trace:'off'},
 webServer:[
  {command:'node backend/tests/e2e-server.js',url:'http://127.0.0.1:5101',reuseExistingServer:false,timeout:120000},
  {command:'npm run preview -- --port 3100',url:'http://127.0.0.1:3100/login',reuseExistingServer:false,timeout:120000,
   env:{API_INTERNAL_URL:'http://127.0.0.1:5101/api',APP_ORIGIN:'http://127.0.0.1:3100'}}
 ],
});
