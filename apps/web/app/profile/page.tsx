import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { findUserById } from "@/lib/auth/users";
import { logoutAction } from "@/lib/auth/actions/login";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

import { ChangePasswordForm } from "./change-password-form";
import { DeleteAccountForm } from "./delete-account-form";
import { ProfileForm } from "./profile-form";
import { ResendVerificationForm } from "./resend-verification-form";

export const metadata: Metadata = { title: "Profile — Ecora" };

export default async function ProfilePage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const user = await findUserById(session.user.id);
  if (!user) redirect("/login");

  return (
    <main className="container flex flex-col gap-6 py-12">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Your profile</h1>
        <form action={logoutAction}>
          <Button type="submit" variant="ghost">
            Log out
          </Button>
        </form>
      </div>

      <Card className="max-w-lg">
        <CardHeader>
          <CardTitle>Account</CardTitle>
          <CardDescription className="flex items-center gap-2">
            {user.email}
            {user.email_verified_at ? (
              <Badge variant="secondary">Verified</Badge>
            ) : (
              <Badge variant="outline">Unverified</Badge>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          {!user.email_verified_at && <ResendVerificationForm />}
          <Separator />
          <ProfileForm fullName={user.full_name} phone={user.phone} />
        </CardContent>
      </Card>

      <Card className="max-w-lg">
        <CardHeader>
          <CardTitle>Change password</CardTitle>
        </CardHeader>
        <CardContent>
          <ChangePasswordForm />
        </CardContent>
      </Card>

      <Card className="max-w-lg border-destructive/30">
        <CardHeader>
          <CardTitle>Danger zone</CardTitle>
          <CardDescription>Delete your Ecora account.</CardDescription>
        </CardHeader>
        <CardContent>
          <DeleteAccountForm
            deletionRequestedAt={user.deletion_requested_at ? user.deletion_requested_at.toISOString() : null}
          />
        </CardContent>
      </Card>
    </main>
  );
}
