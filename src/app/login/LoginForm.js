'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { auth } from '@/utils/auth';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { useUser } from '@/lib/UserContext';

export function LoginForm() {
  const [isLoading, setIsLoading] = useState(false);
  const [err, setErr] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const router = useRouter();
  const { refetch } = useUser();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setIsLoading(true);
      setErr(false);
      
      // Nettoyer complètement le localStorage avant la connexion
      localStorage.clear();
      
      // Connexion avec les identifiants
      const result = await auth.signIn(email, password);
      
      if (!result || !result.details) {
        throw new Error("Impossible de récupérer les détails de l'utilisateur");
      }
      
      // Stocker les données utilisateur de manière cohérente
      const userData = {
        user: {
          id: result.details.id,
          email: result.details.email,
          nom: result.details.nom,
        },
        role: result.details.role || null,
      };
      
      localStorage.setItem('userData', JSON.stringify(userData));
      localStorage.setItem('user_role', result.details.role);
      localStorage.setItem('user_name', result.details.nom);
      
      // Rafraîchir le contexte utilisateur
      await refetch();
      
      toast.success(`Bienvenue ${result.details.nom}!`);
      router.push('/dashboard');
      router.refresh();
    } catch (error) {
      console.error("Erreur de connexion:", error);
      setErr(error.message || "Erreur d'authentification");
      
      // Afficher un message spécifique si le compte est désactivé
      if (error.message.includes("désactivé")) {
        toast.error("Votre compte a été désactivé. Veuillez contacter l'administrateur.");
        
        // Rediriger vers la page d'accueil après un court délai
        setTimeout(() => {
          router.push('/');
        }, 2000);
      } else {
        toast.error("Erreur d'authentification, veuillez vérifier vos identifiants");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (

    <div className="md:w-1/2 w-full mx-auto max-w-md">
      <div className="bg-white rounded-xl shadow-lg p-6 m-2 space-y-4 text-gray-900">
        <h3 className="text-2xl font-semibold text-center">Connexion</h3>
        <p className="text-sm text-gray-500 text-center">
          Accédez à votre espace personnel
        </p>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div>
            <Label className="block text-sm font-medium text-gray-700">
             Votre Adresse email
            </Label>
            <Input
                 id="email"
                 type="email"
                 value={email}
                 onChange={(e) => setEmail(e.target.value)}
                 disabled={isLoading}
                 required
                 placeholder="exemple@gmail.com"
                 name="email"
                className="w-full mt-1 px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-emerald-500 focus:border-emerald-500"
            />
          </div>
          <div>
            <Label className="block text-sm font-medium text-gray-700">
             Votre Mot de passe
            </Label>
            <Input
               id="password"
               type="password"
               value={password}
               onChange={(e) => setPassword(e.target.value)}
               disabled={isLoading}
               placeholder="••••••••"
               required
               className="w-full mt-1 px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-emerald-500 focus:border-emerald-500"
            />
          </div>

          {err && (
            <div className="text-red-500 text-sm">{err}</div>
          )}
          


          <Button  type="submit" disabled={isLoading}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-2 rounded-md transition"
          >
            {isLoading && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
             Se connecter
          </Button>
        </form>
      </div>
    </div>
   
  );
}