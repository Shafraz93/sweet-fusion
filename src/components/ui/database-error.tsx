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
        <p>The local PostgreSQL server may have stopped. Start it in a separate terminal:</p>
        <pre className="rounded-lg bg-white px-4 py-3 text-xs text-slate-800 border border-amber-200">
          npx prisma dev
        </pre>
        <p>Then restart the Next.js dev server and refresh this page.</p>
        <Link href="/">
          <Button variant="outline">Retry</Button>
        </Link>
      </CardContent>
    </Card>
  );
}
