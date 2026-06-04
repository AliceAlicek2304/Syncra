# AI_RULES.md — Syncra

## Tech Stack

- **React 18+** with **TypeScript** — all components and pages must be `.tsx` files.
- **React Router v6** — all routes defined in `src/App.tsx` using `<Routes>` and `<Route>`.
- **Tailwind CSS** — the only styling approach. No CSS modules, styled-components, or inline styles.
- **shadcn/ui** — the primary component library. Use pre-built shadcn/ui components (Button, Card, Dialog, Input, Select, etc.) for all common UI patterns. Do NOT create custom wrappers for them.
- **Radix UI** — already installed as the underlying primitive layer for shadcn/ui. Do NOT import Radix directly; always use the shadcn/ui wrapper components.
- **lucide-react** — for all icons. Import individual icons by name (e.g., `import { Search, Bell } from 'lucide-react'`).
- **react-hot-toast** — for toast/snackbar notifications. Use the `showSuccess`, `showError`, `showLoading` utilities from `src/utils/toast.ts`.
- **Epilogue** — headline/display font. **Inter** — body font. These are set globally via Tailwind.

## Library Rules

| Concern | Library | Why |
|---|---|---|
| **Icons** | `lucide-react` | Always. Never use inline SVGs, emoji, or another icon lib. |
| **Dialogs / Modals** | shadcn/ui `Dialog` | Use `<Dialog>`, `<DialogTrigger>`, `<DialogContent>`, etc. |
| **Dropdowns / Selects** | shadcn/ui `Select` or `DropdownMenu` | Use the shadcn components, never native `<select>`. |
| **Forms** | Native React state or shadcn `Input` + `Label` | Keep forms simple; use shadcn components for inputs, labels, buttons. |
| **Cards / Containers** | shadcn/ui `Card` | Use `<Card>`, `<CardHeader>`, `<CardContent>`, `<CardFooter>`. |
| **Buttons** | shadcn/ui `Button` | Use `<Button variant="default\|secondary\|outline\|ghost\|destructive">`. |
| **Badges** | shadcn/ui `Badge` | For status labels, counts, or tags. |
| **Navigation** | React Router `<Link>` / `useNavigate` | For client-side routing. Never use `<a>` tags for internal links. |
| **Data display / Tables** | shadcn/ui `Table` | Use `<Table>`, `<TableHeader>`, `<TableBody>`, etc. |
| **Tabs** | shadcn/ui `Tabs` | Use `<Tabs>`, `<TabsList>`, `<TabsTrigger>`, `<TabsContent>`. |
| **Tooltips** | shadcn/ui `Tooltip` | Wrap with `<TooltipProvider>` / `<Tooltip>` / `<TooltipTrigger>` / `<TooltipContent>`. |
| **Toasts** | `react-hot-toast` | Import from `src/utils/toast.ts` — never call `toast()` directly. |
| **Hooks** | Custom hooks in `src/hooks/` | Each hook gets its own file. Keep hooks focused and small. |
| **API calls / data fetching** | `fetch` or plain async functions | No React Query / SWR unless explicitly added. |

## File Structure

```
src/
├── components/     # Reusable UI components (one file per component)
├── pages/          # Route-level pages (Index.tsx is the default)
├── hooks/          # Custom React hooks
├── utils/          # Utility functions
├── lib/            # shadcn/ui helpers (do not edit)
├── App.tsx         # Routes defined here
└── main.tsx        # Entry point
```

## Coding Conventions

- **One component per file**. Keep components under 100 lines; refactor when they grow.
- **Always use Tailwind** for layout, spacing, colors, typography. No CSS files except `index.css` for Tailwind directives.
- **Responsive design** is mandatory. Use Tailwind breakpoints (`sm:`, `md:`, `lg:`, `xl:`).
- **Use `"use client"`** at the top of every component file.
- **No try/catch** unless the user explicitly asks for error handling — let errors bubble up to the AI.
- **No over-engineering** — build only what the user asks for. Keep it simple.
- **Imports** — first-party modules first, then third-party packages. Group clearly.
- **Exports** — always use default exports for components, named exports for utilities.