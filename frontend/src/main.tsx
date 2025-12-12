import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";
import { createBrowserRouter, RouterProvider } from "react-router";
import { LoginPage } from "./LoginPage.tsx";
import { RegisterPage } from "./RegisterPage.tsx";
import { LogoutPage } from "./LogoutPage.tsx";
import { ProtectedRoute } from "./components/ProtectedRoute.tsx";
import { DashboardLayout } from "./components/DashboardLayout.tsx";

const routes = [
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
];

const router = createBrowserRouter(routes);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>
);
