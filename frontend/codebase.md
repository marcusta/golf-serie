# .gitignore

```
# Logs
logs
*.log
npm-debug.log*
yarn-debug.log*
yarn-error.log*
pnpm-debug.log*
lerna-debug.log*

node_modules
dist
dist-ssr
*.local

# Editor directories and files
.vscode/*
!.vscode/extensions.json
.idea
.DS_Store
*.suo
*.ntvs*
*.njsproj
*.sln
*.sw?

```

# components.json

```json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "new-york",
  "rsc": false,
  "tsx": true,
  "tailwind": {
    "config": "",
    "css": "src/index.css",
    "baseColor": "neutral",
    "cssVariables": true,
    "prefix": ""
  },
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils",
    "ui": "@/components/ui",
    "lib": "@/lib",
    "hooks": "@/hooks"
  },
  "iconLibrary": "lucide"
}
```

# eslint.config.js

```js
import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  { ignores: ['dist'] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],
    },
  },
)

```

# index.html

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/vite.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Vite + React + TS</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>

```

# package.json

```json
{
  "name": "frontend",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "lint": "eslint .",
    "preview": "vite preview"
  },
  "dependencies": {
    "@radix-ui/react-avatar": "^1.1.10",
    "@radix-ui/react-icons": "^1.3.2",
    "@radix-ui/react-slot": "^1.2.3",
    "@tailwindcss/vite": "^4.1.7",
    "@tanstack/react-query": "^5.77.2",
    "@tanstack/react-query-devtools": "^5.77.2",
    "@tanstack/react-router": "^1.120.11",
    "@tanstack/router-devtools": "^1.120.11",
    "class-variance-authority": "^0.7.1",
    "clsx": "^2.1.1",
    "lucide-react": "^0.511.0",
    "react": "^19.1.0",
    "react-dom": "^19.1.0",
    "tailwind-merge": "^3.3.0"
  },
  "devDependencies": {
    "@eslint/js": "^9.25.0",
    "@types/react": "^19.1.2",
    "@types/react-dom": "^19.1.2",
    "@vitejs/plugin-react": "^4.4.1",
    "autoprefixer": "^10.4.21",
    "eslint": "^9.25.0",
    "eslint-plugin-react-hooks": "^5.2.0",
    "eslint-plugin-react-refresh": "^0.4.19",
    "globals": "^16.0.0",
    "postcss": "^8.5.3",
    "tailwindcss": "^4.1.7",
    "tw-animate-css": "^1.3.0",
    "typescript": "~5.8.3",
    "typescript-eslint": "^8.30.1",
    "vite": "^6.3.5"
  }
}

```

# public/vite.svg

This is a file of the type: SVG Image

# README.md

```md
# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

\`\`\`js
export default tseslint.config({
  extends: [
    // Remove ...tseslint.configs.recommended and replace with this
    ...tseslint.configs.recommendedTypeChecked,
    // Alternatively, use this for stricter rules
    ...tseslint.configs.strictTypeChecked,
    // Optionally, add this for stylistic rules
    ...tseslint.configs.stylisticTypeChecked,
  ],
  languageOptions: {
    // other options...
    parserOptions: {
      project: ['./tsconfig.node.json', './tsconfig.app.json'],
      tsconfigRootDir: import.meta.dirname,
    },
  },
})
\`\`\`

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

\`\`\`js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default tseslint.config({
  plugins: {
    // Add the react-x and react-dom plugins
    'react-x': reactX,
    'react-dom': reactDom,
  },
  rules: {
    // other rules...
    // Enable its recommended typescript rules
    ...reactX.configs['recommended-typescript'].rules,
    ...reactDom.configs.recommended.rules,
  },
})
\`\`\`

```

# src/api/competitions.ts

```ts
import { useQuery } from "@tanstack/react-query";

const API_URL = "/api";

export interface Competition {
  id: number;
  name: string;
  date: string;
  course_id: number;
  created_at: string;
  updated_at: string;
}

export function useCompetitions() {
  return useQuery<Competition[]>({
    queryKey: ["competitions"],
    queryFn: async () => {
      const response = await fetch(`${API_URL}/competitions`);
      if (!response.ok) {
        throw new Error("Network response was not ok");
      }
      return response.json();
    },
  });
}

export function useCompetition(id: number) {
  return useQuery<Competition>({
    queryKey: ["competition", id],
    queryFn: async () => {
      const response = await fetch(`${API_URL}/competitions/${id}`);
      if (!response.ok) {
        throw new Error("Network response was not ok");
      }
      return response.json();
    },
  });
}

```

# src/api/courses.ts

```ts
import { useQuery } from "@tanstack/react-query";

const API_URL = "/api";

export interface Course {
  id: number;
  name: string;
  pars: {
    holes: number[];
    out: number;
    in: number;
    total: number;
  };
  created_at: string;
  updated_at: string;
}

export function useCourses() {
  return useQuery<Course[]>({
    queryKey: ["courses"],
    queryFn: async () => {
      const response = await fetch(`${API_URL}/courses`);
      if (!response.ok) {
        throw new Error("Network response was not ok");
      }
      return response.json();
    },
  });
}

export function useCourse(id: number) {
  return useQuery<Course>({
    queryKey: ["course", id],
    queryFn: async () => {
      const response = await fetch(`${API_URL}/courses/${id}`);
      if (!response.ok) {
        throw new Error("Network response was not ok");
      }
      return response.json();
    },
  });
}

```

# src/api/participants.ts

```ts
import { useQuery } from "@tanstack/react-query";

const API_URL = "/api";

export interface Participant {
  id: number;
  tee_order: number;
  team_id: number;
  tee_time_id: number;
  position_name: string;
  player_names?: string;
  score: number[];
  created_at: string;
  updated_at: string;
}

export function useParticipants() {
  return useQuery<Participant[]>({
    queryKey: ["participants"],
    queryFn: async () => {
      const response = await fetch(`${API_URL}/participants`);
      if (!response.ok) {
        throw new Error("Network response was not ok");
      }
      return response.json();
    },
  });
}

export function useParticipant(id: number) {
  return useQuery<Participant>({
    queryKey: ["participant", id],
    queryFn: async () => {
      const response = await fetch(`${API_URL}/participants/${id}`);
      if (!response.ok) {
        throw new Error("Network response was not ok");
      }
      return response.json();
    },
  });
}

```

# src/api/teams.ts

```ts
import { useQuery } from "@tanstack/react-query";

const API_URL = "/api";

export interface Team {
  id: number;
  name: string;
  created_at: string;
  updated_at: string;
}

export function useTeams() {
  return useQuery<Team[]>({
    queryKey: ["teams"],
    queryFn: async () => {
      const response = await fetch(`${API_URL}/teams`);
      if (!response.ok) {
        throw new Error("Network response was not ok");
      }
      return response.json();
    },
  });
}

export function useTeam(id: number) {
  return useQuery<Team>({
    queryKey: ["team", id],
    queryFn: async () => {
      const response = await fetch(`${API_URL}/teams/${id}`);
      if (!response.ok) {
        throw new Error("Network response was not ok");
      }
      return response.json();
    },
  });
}

```

# src/api/tee-times.ts

```ts
import { useQuery } from "@tanstack/react-query";

const API_URL = "/api";

export interface TeeTime {
  id: number;
  teetime: string;
  competition_id: number;
  created_at: string;
  updated_at: string;
}

export function useTeeTimes() {
  return useQuery<TeeTime[]>({
    queryKey: ["tee-times"],
    queryFn: async () => {
      const response = await fetch(`${API_URL}/tee-times`);
      if (!response.ok) {
        throw new Error("Network response was not ok");
      }
      return response.json();
    },
  });
}

export function useTeeTime(id: number) {
  return useQuery<TeeTime>({
    queryKey: ["tee-time", id],
    queryFn: async () => {
      const response = await fetch(`${API_URL}/tee-times/${id}`);
      if (!response.ok) {
        throw new Error("Network response was not ok");
      }
      return response.json();
    },
  });
}

```

# src/App.css

```css
#root {
  max-width: 1280px;
  margin: 0 auto;
  padding: 2rem;
  text-align: center;
}

.logo {
  height: 6em;
  padding: 1.5em;
  will-change: filter;
  transition: filter 300ms;
}
.logo:hover {
  filter: drop-shadow(0 0 2em #646cffaa);
}
.logo.react:hover {
  filter: drop-shadow(0 0 2em #61dafbaa);
}

@keyframes logo-spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

@media (prefers-reduced-motion: no-preference) {
  a:nth-of-type(2) .logo {
    animation: logo-spin infinite 20s linear;
  }
}

.card {
  padding: 2em;
}

.read-the-docs {
  color: #888;
}

```

# src/App.tsx

```tsx
import { Link, Outlet, useRouterState } from "@tanstack/react-router";
import { Map, Users, Trophy, UserCheck, Clock } from "lucide-react";

const navLinks = [
  { to: "/courses", label: "Courses", icon: Map },
  { to: "/teams", label: "Teams", icon: Users },
  { to: "/competitions", label: "Competitions", icon: Trophy },
  { to: "/participants", label: "Participants", icon: UserCheck },
  { to: "/tee-times", label: "Tee Times", icon: Clock },
];

function GolfIcon() {
  return (
    <svg
      width="32"
      height="32"
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="inline-block mr-3 align-middle"
    >
      <ellipse cx="16" cy="26" rx="12" ry="4" fill="#A3DE83" />
      <rect x="15" y="6" width="2" height="16" rx="1" fill="#555" />
      <path d="M16 6L24 10L16 14V6Z" fill="#F43F5E" />
      <circle
        cx="16"
        cy="6"
        r="1.5"
        fill="#fff"
        stroke="#555"
        strokeWidth="0.5"
      />
    </svg>
  );
}

export default function App() {
  const { location } = useRouterState();

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-green-50 via-slate-50 to-green-100">
      <header className="border-b bg-white/95 backdrop-blur-sm sticky top-0 z-10 shadow-sm">
        <div className="max-w-4xl mx-auto flex flex-col lg:flex-row items-center justify-between h-auto lg:h-20 px-4 py-4 lg:py-0 gap-4">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-gray-900 flex items-center">
            <GolfIcon /> Golf Scorecard
          </h1>
          <nav className="flex flex-wrap gap-2 justify-center">
            {navLinks.map((link) => {
              const isActive = location.pathname.startsWith(link.to);
              const IconComponent = link.icon;
              return (
                <Link
                  key={link.to}
                  to={link.to}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-full font-medium transition-all duration-200 text-sm hover:scale-105 transform
                    ${
                      isActive
                        ? "bg-green-600 text-white shadow-lg shadow-green-600/25"
                        : "bg-white/80 text-green-800 hover:bg-green-50 border border-green-200 hover:border-green-300"
                    }
                  `}
                >
                  <IconComponent className="h-4 w-4" />
                  {link.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </header>
      <div className="flex-1 flex flex-col items-center w-full">
        <main className="w-full max-w-4xl px-4 py-8 flex-1">
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-6 lg:p-8 min-h-[70vh]">
            <Outlet />
          </div>
        </main>
      </div>
      <footer className="text-center text-xs text-slate-500 py-6 mt-auto">
        <div className="max-w-4xl mx-auto px-4">
          <div className="flex items-center justify-center gap-2 mb-2">
            <GolfIcon />
            <span className="font-medium">Golf Scorecard</span>
          </div>
          <p>
            &copy; {new Date().getFullYear()} Golf Scorecard. Made with ❤️ for
            golf enthusiasts.
          </p>
        </div>
      </footer>
    </div>
  );
}

```

# src/assets/react.svg

This is a file of the type: SVG Image

# src/components/ui/avatar.tsx

```tsx
import * as React from "react"
import * as AvatarPrimitive from "@radix-ui/react-avatar"

import { cn } from "@/lib/utils"

function Avatar({
  className,
  ...props
}: React.ComponentProps<typeof AvatarPrimitive.Root>) {
  return (
    <AvatarPrimitive.Root
      data-slot="avatar"
      className={cn(
        "relative flex size-8 shrink-0 overflow-hidden rounded-full",
        className
      )}
      {...props}
    />
  )
}

function AvatarImage({
  className,
  ...props
}: React.ComponentProps<typeof AvatarPrimitive.Image>) {
  return (
    <AvatarPrimitive.Image
      data-slot="avatar-image"
      className={cn("aspect-square size-full", className)}
      {...props}
    />
  )
}

function AvatarFallback({
  className,
  ...props
}: React.ComponentProps<typeof AvatarPrimitive.Fallback>) {
  return (
    <AvatarPrimitive.Fallback
      data-slot="avatar-fallback"
      className={cn(
        "bg-muted flex size-full items-center justify-center rounded-full",
        className
      )}
      {...props}
    />
  )
}

export { Avatar, AvatarImage, AvatarFallback }

```

# src/components/ui/badge.tsx

```tsx
import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center justify-center rounded-md border px-2 py-0.5 text-xs font-medium w-fit whitespace-nowrap shrink-0 [&>svg]:size-3 gap-1 [&>svg]:pointer-events-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive transition-[color,box-shadow] overflow-hidden",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground [a&]:hover:bg-primary/90",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground [a&]:hover:bg-secondary/90",
        destructive:
          "border-transparent bg-destructive text-white [a&]:hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/60",
        outline:
          "text-foreground [a&]:hover:bg-accent [a&]:hover:text-accent-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({
  className,
  variant,
  asChild = false,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "span"

  return (
    <Comp
      data-slot="badge"
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  )
}

export { Badge, badgeVariants }

```

# src/components/ui/button.tsx

```tsx
import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow-xs hover:bg-primary/90",
        destructive:
          "bg-destructive text-white shadow-xs hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/60",
        outline:
          "border bg-background shadow-xs hover:bg-accent hover:text-accent-foreground dark:bg-input/30 dark:border-input dark:hover:bg-input/50",
        secondary:
          "bg-secondary text-secondary-foreground shadow-xs hover:bg-secondary/80",
        ghost:
          "hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent/50",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 px-4 py-2 has-[>svg]:px-3",
        sm: "h-8 rounded-md gap-1.5 px-3 has-[>svg]:px-2.5",
        lg: "h-10 rounded-md px-6 has-[>svg]:px-4",
        icon: "size-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot : "button"

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }

```

# src/components/ui/card.tsx

```tsx
import * as React from "react"

import { cn } from "@/lib/utils"

function Card({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card"
      className={cn(
        "bg-card text-card-foreground flex flex-col gap-6 rounded-xl border py-6 shadow-sm",
        className
      )}
      {...props}
    />
  )
}

function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-header"
      className={cn(
        "@container/card-header grid auto-rows-min grid-rows-[auto_auto] items-start gap-1.5 px-6 has-data-[slot=card-action]:grid-cols-[1fr_auto] [.border-b]:pb-6",
        className
      )}
      {...props}
    />
  )
}

function CardTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-title"
      className={cn("leading-none font-semibold", className)}
      {...props}
    />
  )
}

function CardDescription({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-description"
      className={cn("text-muted-foreground text-sm", className)}
      {...props}
    />
  )
}

function CardAction({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-action"
      className={cn(
        "col-start-2 row-span-2 row-start-1 self-start justify-self-end",
        className
      )}
      {...props}
    />
  )
}

function CardContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-content"
      className={cn("px-6", className)}
      {...props}
    />
  )
}

function CardFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-footer"
      className={cn("flex items-center px-6 [.border-t]:pt-6", className)}
      {...props}
    />
  )
}

export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardAction,
  CardDescription,
  CardContent,
}

```

# src/components/ui/skeleton.tsx

```tsx
import { cn } from "@/lib/utils"

function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={cn("bg-accent animate-pulse rounded-md", className)}
      {...props}
    />
  )
}

export { Skeleton }

```

# src/index.css

```css
@import "tw-animate-css";

@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --background: #ffffff;
    --foreground: #0f172a;
    --card: #ffffff;
    --card-foreground: #0f172a;
    --popover: #ffffff;
    --popover-foreground: #0f172a;
    --primary: #16a34a;
    --primary-foreground: #f8fafc;
    --secondary: #f1f5f9;
    --secondary-foreground: #0f172a;
    --muted: #f1f5f9;
    --muted-foreground: #64748b;
    --accent: #f1f5f9;
    --accent-foreground: #0f172a;
    --destructive: #ef4444;
    --destructive-foreground: #f8fafc;
    --border: #e2e8f0;
    --input: #e2e8f0;
    --ring: #16a34a;
    --radius: 0.5rem;
  }

  .dark {
    --background: #020617;
    --foreground: #f8fafc;
    --card: #020617;
    --card-foreground: #f8fafc;
    --popover: #020617;
    --popover-foreground: #f8fafc;
    --primary: #f8fafc;
    --primary-foreground: #020617;
    --secondary: #1e293b;
    --secondary-foreground: #f8fafc;
    --muted: #1e293b;
    --muted-foreground: #94a3b8;
    --accent: #1e293b;
    --accent-foreground: #f8fafc;
    --destructive: #7f1d1d;
    --destructive-foreground: #f8fafc;
    --border: #1e293b;
    --input: #1e293b;
    --ring: #94a3b8;
  }

  * {
    border-color: var(--border);
  }

  body {
    background-color: var(--background);
    color: var(--foreground);
    font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI",
      Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif;
    line-height: 1.5;
    font-weight: 400;
    font-synthesis: none;
    text-rendering: optimizeLegibility;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    margin: 0;
    min-width: 320px;
    min-height: 100vh;
  }
}

@layer utilities {
  .bg-background {
    background-color: var(--background);
  }
  .text-foreground {
    color: var(--foreground);
  }
  .bg-card {
    background-color: var(--card);
  }
  .text-card-foreground {
    color: var(--card-foreground);
  }
  .bg-primary {
    background-color: var(--primary);
  }
  .text-primary-foreground {
    color: var(--primary-foreground);
  }
  .bg-secondary {
    background-color: var(--secondary);
  }
  .text-secondary-foreground {
    color: var(--secondary-foreground);
  }
  .bg-muted {
    background-color: var(--muted);
  }
  .text-muted-foreground {
    color: var(--muted-foreground);
  }
  .bg-accent {
    background-color: var(--accent);
  }
  .text-accent-foreground {
    color: var(--accent-foreground);
  }
  .bg-destructive {
    background-color: var(--destructive);
  }
  .text-destructive-foreground {
    color: var(--destructive-foreground);
  }
  .bg-input {
    background-color: var(--input);
  }
  .border-border {
    border-color: var(--border);
  }
  .ring-ring {
    --tw-ring-color: var(--ring);
  }
}

```

# src/lib/utils.ts

```ts
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

```

# src/main.tsx

```tsx
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { RouterProvider } from "@tanstack/react-router";
import router from "./router";
import "./index.css";

const queryClient = new QueryClient();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  </StrictMode>
);

```

# src/router.tsx

```tsx
import { createRouter, RootRoute, Route } from "@tanstack/react-router";
import App from "./App";
import Courses from "./views/Courses";
import Teams from "./views/Teams";
import Competitions from "./views/Competitions";
import Participants from "./views/Participants";
import TeeTimes from "./views/TeeTimes";

// Root route
const rootRoute = new RootRoute({
  component: App,
});

const coursesRoute = new Route({
  getParentRoute: () => rootRoute,
  path: "courses",
  component: Courses,
});
const teamsRoute = new Route({
  getParentRoute: () => rootRoute,
  path: "teams",
  component: Teams,
});
const competitionsRoute = new Route({
  getParentRoute: () => rootRoute,
  path: "competitions",
  component: Competitions,
});
const participantsRoute = new Route({
  getParentRoute: () => rootRoute,
  path: "participants",
  component: Participants,
});
const teeTimesRoute = new Route({
  getParentRoute: () => rootRoute,
  path: "tee-times",
  component: TeeTimes,
});

const routeTree = rootRoute.addChildren([
  coursesRoute,
  teamsRoute,
  competitionsRoute,
  participantsRoute,
  teeTimesRoute,
]);

const router = createRouter({
  routeTree,
});

export default router;

```

# src/views/Competitions.tsx

```tsx
import { useCompetitions } from "../api/competitions";

export default function Competitions() {
  const { data: competitions, isLoading, error } = useCompetitions();

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error loading competitions</div>;

  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">Competitions</h2>
      <ul>
        {competitions?.map((competition) => (
          <li key={competition.id} className="mb-2">
            {competition.name} -{" "}
            {new Date(competition.date).toLocaleDateString()}
          </li>
        ))}
      </ul>
    </div>
  );
}

```

# src/views/Courses.tsx

```tsx
import { useCourses } from "../api/courses";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Map, Target, TrendingUp } from "lucide-react";

function CourseSkeleton() {
  return (
    <Card className="mb-4">
      <CardHeader>
        <Skeleton className="h-6 w-[200px]" />
        <Skeleton className="h-4 w-[150px]" />
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <Skeleton className="h-4 w-full" />
          <div className="flex gap-2">
            <Skeleton className="h-6 w-16" />
            <Skeleton className="h-6 w-16" />
            <Skeleton className="h-6 w-16" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function Courses() {
  const { data: courses, isLoading, error } = useCourses();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center space-x-2 mb-6">
          <Map className="h-8 w-8 text-green-600" />
          <h2 className="text-3xl font-bold text-gray-900">Courses</h2>
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          {[...Array(4)].map((_, i) => (
            <CourseSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardContent className="p-6">
          <div className="flex items-center space-x-2 text-red-700">
            <Map className="h-5 w-5" />
            <p className="font-medium">Error loading courses</p>
          </div>
          <p className="text-red-600 text-sm mt-2">
            Please try refreshing the page or contact support if the problem
            persists.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (!courses || courses.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center space-x-2 mb-6">
          <Map className="h-8 w-8 text-green-600" />
          <h2 className="text-3xl font-bold text-gray-900">Courses</h2>
        </div>
        <Card className="border-dashed border-2 border-gray-300">
          <CardContent className="p-12 text-center">
            <Map className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              No courses available
            </h3>
            <p className="text-gray-600">
              Add some golf courses to get started with your scorecard.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Map className="h-8 w-8 text-green-600" />
          <h2 className="text-3xl font-bold text-gray-900">Courses</h2>
        </div>
        <Badge variant="secondary" className="text-sm">
          {courses.length} {courses.length === 1 ? "course" : "courses"}
        </Badge>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {courses.map((course) => (
          <Card
            key={course.id}
            className="hover:shadow-lg transition-shadow duration-200 border-l-4 border-l-green-500"
          >
            <CardHeader className="pb-3">
              <CardTitle className="text-xl text-gray-900 flex items-center gap-2">
                <Target className="h-5 w-5 text-green-600" />
                {course.name}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="text-center p-3 bg-green-50 rounded-lg">
                  <p className="text-xs text-green-600 font-medium uppercase tracking-wide">
                    Front 9
                  </p>
                  <p className="text-lg font-bold text-green-700">
                    Par {course.pars.out}
                  </p>
                </div>
                <div className="text-center p-3 bg-blue-50 rounded-lg">
                  <p className="text-xs text-blue-600 font-medium uppercase tracking-wide">
                    Back 9
                  </p>
                  <p className="text-lg font-bold text-blue-700">
                    Par {course.pars.in}
                  </p>
                </div>
                <div className="text-center p-3 bg-purple-50 rounded-lg">
                  <p className="text-xs text-purple-600 font-medium uppercase tracking-wide">
                    Total
                  </p>
                  <p className="text-lg font-bold text-purple-700">
                    Par {course.pars.total}
                  </p>
                </div>
              </div>

              <div className="pt-2 border-t border-gray-100">
                <div className="flex items-center justify-between text-sm text-gray-600">
                  <div className="flex items-center gap-1">
                    <TrendingUp className="h-4 w-4" />
                    <span>{course.pars.holes.length} holes</span>
                  </div>
                  <span className="text-xs">Course #{course.id}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

```

# src/views/Participants.tsx

```tsx
import { useParticipants } from "../api/participants";
import { Users, Trophy, Clock, Hash } from "lucide-react";

function getPlayerInitials(playerNames?: string) {
  if (!playerNames) return "U";
  return playerNames
    .split(" ")
    .map((name) => name[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function getAvatarColor(index: number) {
  const colors = [
    "bg-blue-500",
    "bg-green-500",
    "bg-purple-500",
    "bg-orange-500",
    "bg-pink-500",
    "bg-teal-500",
    "bg-indigo-500",
    "bg-red-500",
  ];
  return colors[index % colors.length];
}

export default function Participants() {
  const { data: participants, isLoading, error } = useParticipants();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center space-x-2 mb-6">
          <Users className="h-8 w-8 text-green-600" />
          <h2 className="text-3xl font-bold text-gray-900">Participants</h2>
        </div>
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="bg-white rounded-lg border border-gray-200 shadow-sm p-6"
            >
              <div className="flex items-center space-x-4">
                <div className="h-12 w-12 bg-gray-200 rounded-full animate-pulse"></div>
                <div className="space-y-2 flex-1">
                  <div className="h-4 bg-gray-200 rounded animate-pulse w-[250px]"></div>
                  <div className="h-4 bg-gray-200 rounded animate-pulse w-[200px]"></div>
                </div>
                <div className="h-6 bg-gray-200 rounded-full animate-pulse w-[80px]"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <div className="flex items-center space-x-2 text-red-700">
          <Trophy className="h-5 w-5" />
          <p className="font-medium">Error loading participants</p>
        </div>
        <p className="text-red-600 text-sm mt-2">
          Please try refreshing the page or contact support if the problem
          persists.
        </p>
      </div>
    );
  }

  if (!participants || participants.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center space-x-2 mb-6">
          <Users className="h-8 w-8 text-green-600" />
          <h2 className="text-3xl font-bold text-gray-900">Participants</h2>
        </div>
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center">
          <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            No participants yet
          </h3>
          <p className="text-gray-600">
            When participants join the competition, they'll appear here.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Users className="h-8 w-8 text-green-600" />
          <h2 className="text-3xl font-bold text-gray-900">Participants</h2>
        </div>
        <span className="bg-gray-100 text-gray-800 text-sm px-3 py-1 rounded-full">
          {participants.length}{" "}
          {participants.length === 1 ? "participant" : "participants"}
        </span>
      </div>

      <div className="grid gap-4">
        {participants.map((participant, index) => (
          <div
            key={participant.id}
            className="bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow duration-200 border-l-4 border-l-green-500"
          >
            <div className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4 flex-1">
                  <div
                    className={`h-12 w-12 ${getAvatarColor(
                      index
                    )} text-white rounded-full flex items-center justify-center font-semibold`}
                  >
                    {getPlayerInitials(participant.player_names)}
                  </div>

                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {participant.player_names || "Unnamed Player"}
                    </h3>
                    <div className="flex items-center space-x-4 mt-1 text-sm text-gray-600">
                      <div className="flex items-center space-x-1">
                        <Hash className="h-4 w-4" />
                        <span>Team {participant.team_id}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Clock className="h-4 w-4" />
                        <span>Tee Time {participant.tee_time_id}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Trophy className="h-4 w-4" />
                        <span>Order: {participant.tee_order}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col items-end space-y-2">
                  <span className="bg-gray-100 text-gray-800 text-sm px-3 py-1 rounded-full border">
                    {participant.position_name}
                  </span>
                  {participant.score && participant.score.length > 0 && (
                    <div className="text-right">
                      <p className="text-xs text-gray-500">Current Score</p>
                      <p className="text-lg font-bold text-green-600">
                        {participant.score.reduce((a, b) => a + b, 0)}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

```

# src/views/Teams.tsx

```tsx
import { useTeams } from "../api/teams";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, Shield, Calendar } from "lucide-react";

function TeamSkeleton() {
  return (
    <Card className="mb-4">
      <CardHeader>
        <div className="flex items-center justify-between">
          <Skeleton className="h-6 w-[180px]" />
          <Skeleton className="h-5 w-[60px] rounded-full" />
        </div>
      </CardHeader>
      <CardContent>
        <Skeleton className="h-4 w-[120px]" />
      </CardContent>
    </Card>
  );
}

function getTeamColor(index: number) {
  const colors = [
    {
      bg: "bg-blue-50",
      border: "border-l-blue-500",
      text: "text-blue-700",
      icon: "text-blue-600",
    },
    {
      bg: "bg-green-50",
      border: "border-l-green-500",
      text: "text-green-700",
      icon: "text-green-600",
    },
    {
      bg: "bg-purple-50",
      border: "border-l-purple-500",
      text: "text-purple-700",
      icon: "text-purple-600",
    },
    {
      bg: "bg-orange-50",
      border: "border-l-orange-500",
      text: "text-orange-700",
      icon: "text-orange-600",
    },
    {
      bg: "bg-pink-50",
      border: "border-l-pink-500",
      text: "text-pink-700",
      icon: "text-pink-600",
    },
    {
      bg: "bg-teal-50",
      border: "border-l-teal-500",
      text: "text-teal-700",
      icon: "text-teal-600",
    },
    {
      bg: "bg-indigo-50",
      border: "border-l-indigo-500",
      text: "text-indigo-700",
      icon: "text-indigo-600",
    },
    {
      bg: "bg-red-50",
      border: "border-l-red-500",
      text: "text-red-700",
      icon: "text-red-600",
    },
  ];
  return colors[index % colors.length];
}

export default function Teams() {
  const { data: teams, isLoading, error } = useTeams();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center space-x-2 mb-6">
          <Users className="h-8 w-8 text-green-600" />
          <h2 className="text-3xl font-bold text-gray-900">Teams</h2>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <TeamSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardContent className="p-6">
          <div className="flex items-center space-x-2 text-red-700">
            <Users className="h-5 w-5" />
            <p className="font-medium">Error loading teams</p>
          </div>
          <p className="text-red-600 text-sm mt-2">
            Please try refreshing the page or contact support if the problem
            persists.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (!teams || teams.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center space-x-2 mb-6">
          <Users className="h-8 w-8 text-green-600" />
          <h2 className="text-3xl font-bold text-gray-900">Teams</h2>
        </div>
        <Card className="border-dashed border-2 border-gray-300">
          <CardContent className="p-12 text-center">
            <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              No teams yet
            </h3>
            <p className="text-gray-600">
              Create teams to organize your golf competition participants.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Users className="h-8 w-8 text-green-600" />
          <h2 className="text-3xl font-bold text-gray-900">Teams</h2>
        </div>
        <Badge variant="secondary" className="text-sm">
          {teams.length} {teams.length === 1 ? "team" : "teams"}
        </Badge>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {teams.map((team, index) => {
          const colors = getTeamColor(index);
          return (
            <Card
              key={team.id}
              className={`hover:shadow-lg transition-shadow duration-200 border-l-4 ${colors.border} ${colors.bg}`}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle
                    className={`text-lg ${colors.text} flex items-center gap-2`}
                  >
                    <Shield className={`h-5 w-5 ${colors.icon}`} />
                    {team.name}
                  </CardTitle>
                  <Badge variant="outline" className="text-xs">
                    #{team.id}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Calendar className="h-4 w-4" />
                  <span>
                    Created {new Date(team.created_at).toLocaleDateString()}
                  </span>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

```

# src/views/TeeTimes.tsx

```tsx
import { useTeeTimes } from "../api/tee-times";

export default function TeeTimes() {
  const { data: teeTimes, isLoading, error } = useTeeTimes();

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error loading tee-times</div>;

  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">Tee Times</h2>
      <ul>
        {teeTimes?.map((teeTime) => (
          <li key={teeTime.id} className="mb-2">
            {new Date(teeTime.teetime).toLocaleString()}
          </li>
        ))}
      </ul>
    </div>
  );
}

```

# src/vite-env.d.ts

```ts
/// <reference types="vite/client" />

```

# tsconfig.app.json

```json
{
  "compilerOptions": {
    "tsBuildInfoFile": "./node_modules/.tmp/tsconfig.app.tsbuildinfo",
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,

    /* Bundler mode */
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "verbatimModuleSyntax": true,
    "moduleDetection": "force",
    "noEmit": true,
    "jsx": "react-jsx",

    /* Linting */
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedSideEffectImports": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["src"]
}

```

# tsconfig.json

```json
{
  "files": [],
  "references": [
    {
      "path": "./tsconfig.app.json"
    },
    {
      "path": "./tsconfig.node.json"
    }
  ],
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}

```

# tsconfig.node.json

```json
{
  "compilerOptions": {
    "tsBuildInfoFile": "./node_modules/.tmp/tsconfig.node.tsbuildinfo",
    "target": "ES2022",
    "lib": ["ES2023"],
    "module": "ESNext",
    "skipLibCheck": true,

    /* Bundler mode */
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "verbatimModuleSyntax": true,
    "moduleDetection": "force",
    "noEmit": true,

    /* Linting */
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "erasableSyntaxOnly": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedSideEffectImports": true
  },
  "include": ["vite.config.ts"]
}

```

# vite.config.ts

```ts
import tailwindcssVite from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { defineConfig } from "vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcssVite()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    proxy: {
      "/api": {
        target: "http://localhost:3000",
        changeOrigin: true,
      },
    },
  },
});

```

