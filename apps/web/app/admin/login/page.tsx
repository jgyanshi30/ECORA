import type { Metadata } from "next";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

import { AdminLoginForm } from "./admin-login-form";

export const metadata: Metadata = { title: "Admin login — Ecora" };

export default function AdminLoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-secondary px-4 py-12">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Admin login</CardTitle>
          <CardDescription>Restricted to Ecora administrators.</CardDescription>
        </CardHeader>
        <CardContent>
          <AdminLoginForm />
        </CardContent>
      </Card>
    </main>
  );
}
