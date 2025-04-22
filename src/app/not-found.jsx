import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";
import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
      <Card className="w-full max-w-md shadow-xl rounded-2xl">
        <CardContent className="flex flex-col items-center text-center space-y-4 p-6">
          <AlertCircle className="text-red-500 w-12 h-12" />
          <h2 className="text-2xl font-bold text-gray-800">Page introuvable</h2>
          <p className="text-gray-600">
            Désolé, la page que vous cherchez n'existe pas ou a été déplacée.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 mt-4">
            <Link href="/login">
              <Button variant="outline">Se connecter</Button>
            </Link>
            <Link href="/dashboard">
              <Button>Aller au Dashboard</Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
