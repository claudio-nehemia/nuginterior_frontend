# FRONTEND_STACK.md

```md
# Frontend Stack Documentation

## Core Stack

- Framework: React
- Language: TypeScript
- Build Tool: Vite
- Styling: Tailwind CSS
- UI Components: shadcn/ui
- Architecture: Feature-Based + Layered Architecture

---

# Frontend Libraries

## Routing
- react-router-dom

Purpose:
- Application routing

---

## HTTP Client
- axios

Purpose:
- API communication
- Interceptor handling

---

## Global State Management
- zustand

Purpose:
- Auth state
- UI state
- Theme state

---

## Server State Management
- @tanstack/react-query

Purpose:
- API cache
- Refetching
- Mutation handling
- Server synchronization

---

## Forms
- react-hook-form

Purpose:
- Form handling

---

## Validation
- zod
- @hookform/resolvers

Purpose:
- Form schema validation

---

## UI Framework
- Tailwind CSS
- shadcn/ui

Purpose:
- Styling system
- Reusable components

---

## Icons
- lucide-react

Purpose:
- Icon system

---

## Toast Notification
- sonner

Purpose:
- Toast notification system

---

## Utility Libraries
- clsx
- tailwind-merge

Purpose:
- Dynamic class merging

---

# Frontend Folder Structure

```bash
src/
├── app/
├── config/
├── core/
├── modules/
├── shared/
├── styles/
````

---

# Frontend Module Structure

```bash
modules/
└── auth/
    ├── api/
    ├── components/
    ├── hooks/
    ├── pages/
    ├── schemas/
    ├── services/
    ├── store/
    └── types/
```

---

# Frontend Architecture Flow

```text
Page
 ↓
Hook
 ↓
API
 ↓
Axios
 ↓
Backend
```

---

# Frontend Environment Variables

```env
VITE_APP_NAME=MyApp
VITE_API_URL=http://localhost:8080/api
```

---

# Axios Standards

## Axios Instance

* Centralized axios instance
* Interceptor enabled

---

## Axios Interceptors

Purpose:

* Attach auth token
* Handle refresh token
* Auto logout
* Global error handling

---

# State Management Standards

## Zustand

Used for:

* Auth state
* Theme state
* Sidebar state

---

## React Query

Used for:

* API cache
* Server synchronization
* Server state

---

# Authentication Standards

## Authentication Strategy

* JWT Access Token
* Refresh Token

---

## Frontend Storage

Recommended:

* Access token in memory
* Refresh token in HttpOnly Cookie

---

# Frontend Coding Standards

## File Naming

* kebab-case

Example:

```text
login-page.tsx
user-table.tsx
auth-service.ts
```

---

## Component Naming

* PascalCase

Example:

```tsx
LoginPage
UserTable
```

---

# Frontend Security Standards

* Protected routes
* Token interceptor
* Form validation
* Secure environment variables
* Route guard
* Request sanitization

```
```
