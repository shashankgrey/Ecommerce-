import {defineConfig} from 'vite'; import react from '@vitejs/plugin-react';
// Dev: proxy API to the Spring Boot backend, so no CORS setup is needed.
export default defineConfig({plugins:[react()],server:{proxy:{'/api':'http://localhost:8080'}}});
