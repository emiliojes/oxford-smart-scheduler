"use client";

import { useState } from "react";
import { login, signup } from "@/lib/auth-actions";
import { useLanguage } from "@/context/LanguageContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export default function AuthPage() {
  const { t } = useLanguage();
  const [isLogin, setIsLogin] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsLoading(true);
    const formData = new FormData(event.currentTarget);
    
    try {
      const result = isLogin ? await login(formData) : await signup(formData);
      if (result?.error) {
        toast.error(result.error);
        setIsLoading(false);
      }
    } catch (e: any) {
      // Next.js redirect() throws internally - this is expected on success
      if (e?.message?.includes("NEXT_REDIRECT") || e?.digest?.includes("NEXT_REDIRECT")) {
        return;
      }
      toast.error("Connection error");
      setIsLoading(false);
    }
  }

  return (
    <div className="flex items-center justify-center min-h-[80vh]">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>{isLogin ? t.auth.login : t.auth.register}</CardTitle>
          <CardDescription>
            {isLogin ? t.auth.signIn : t.auth.signUp}
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">{t.auth.username}</Label>
              <Input id="username" name="username" required minLength={3} maxLength={31} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">{t.auth.password}</Label>
              <Input id="password" name="password" type="password" required minLength={6} maxLength={255} />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col space-y-4">
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isLogin ? t.auth.signIn : t.auth.signUp}
            </Button>
            <Button 
              type="button" 
              variant="link" 
              onClick={() => setIsLogin(!isLogin)}
              className="text-sm"
            >
              {isLogin ? t.auth.noAccount : t.auth.hasAccount}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
