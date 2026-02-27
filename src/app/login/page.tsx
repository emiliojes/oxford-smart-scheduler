"use client";

import { useState } from "react";
import { signup } from "@/lib/auth-actions";
import { useLanguage } from "@/context/LanguageContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, Eye, EyeOff } from "lucide-react";
import { useRouter } from "next/navigation";

export default function AuthPage() {
  const { t } = useLanguage();
  const [isLogin, setIsLogin] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsLoading(true);
    const formData = new FormData(event.currentTarget);

    try {
      if (isLogin) {
        const response = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            username: formData.get("username"),
            password: formData.get("password"),
          }),
        });
        const result = await response.json();
        if (!response.ok) {
          toast.error(result.error || "Login failed");
          setIsLoading(false);
        } else {
          router.push("/");
          router.refresh();
        }
      } else {
        const result = await signup(formData);
        if (result?.error) {
          toast.error(result.error);
          setIsLoading(false);
        }
      }
    } catch (e: any) {
      if (e?.digest?.includes("NEXT_REDIRECT")) return;
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
              <div className="relative">
                <Input id="password" name="password" type={showPassword ? "text" : "password"} required minLength={6} maxLength={255} className="pr-10" />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
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
