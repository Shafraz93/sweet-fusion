import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export function DatabaseError({
  message = "Cannot connect to the database.",
}: {
  message?: string;
}) {
  return (
    <Card className="max-w-xl border-amber-200 bg-amber-50">
      <CardHeader>
        <CardTitle className="text-amber-900">Database unavailable</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-sm text-amber-900">
        <p>{message}</p>
        <p className="text-xs text-amber-800">
          For Vercel: set <code className="rounded bg-white px-1">DATABASE_URL</code> to your
          Supabase Transaction pooler URL (port 6543, with{" "}
          <code className="rounded bg-white px-1">?pgbouncer=true</code>).
        </p>
        <Link href="/">
          <Button variant="outline">Retry</Button>
        </Link>
      </CardContent>
    </Card>
  );
}
