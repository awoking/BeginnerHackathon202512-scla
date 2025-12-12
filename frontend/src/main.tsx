import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import "./index.css";

import App from "./App.tsx";
import { DashboardLayout } from "./components/DashboardLayout.tsx";
import { ProtectedRoute } from "./components/ProtectedRoute.tsx";
import { LoginPage } from "./LoginPage.tsx";
import { LogoutPage } from "./LogoutPage.tsx";
import { RegisterPage } from "./RegisterPage.tsx";
import { TasksPage } from "./TasksPage.tsx";
import { ProjectsPage } from "./ProjectsPage.tsx";

const router = createBrowserRouter([
  {
    path: "/login",
    element: <LoginPage />,
  },
  {
    path: "/register",
    element: <RegisterPage />,
  },
  {
    path: "/logout",
    element: <LogoutPage />,
  },
  {
    path: "/",
    element: (
      <ProtectedRoute>
        <DashboardLayout>
          <App />
        </DashboardLayout>
      </ProtectedRoute>
    ),
  },
  {
    path: "/projects",
    element: (
      <ProtectedRoute>
        <DashboardLayout>
          <ProjectsPage />
        </DashboardLayout>
      </ProtectedRoute>
    ),
  },
  {
    path: "/projects/:projectId",
    element: (
      <ProtectedRoute>
        <DashboardLayout>
          <TasksPage />
        </DashboardLayout>
      </ProtectedRoute>
    ),
  },
  {
    path: "/tasks",
    element: (
      <ProtectedRoute>
        <DashboardLayout>
          <TasksPage />
        </DashboardLayout>
      </ProtectedRoute>
    ),
  },
]);

const rootEl = document.getElementById("root");

if (rootEl) {
  createRoot(rootEl).render(
    <StrictMode>
      <RouterProvider router={router} />
    </StrictMode>
  );
}
