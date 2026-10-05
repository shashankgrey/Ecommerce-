# Shop web (React + Vite)
Prereq: backend running on :8080 (`docker compose up --build` in the backend project).
```
npm install
npm run dev     # http://localhost:5173, /api is proxied to :8080
npm run build   # static files in dist/ - serve behind the same origin as /api (nginx or Spring static)
```
Backend tweak for readable error messages: add `server.error.include-message: always` to application.yml.
Admin pages need role ADMIN: `update users set role='ADMIN' where email='you@x.com'` then sign in again.
