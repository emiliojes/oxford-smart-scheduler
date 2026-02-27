"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { useLanguage } from "@/context/LanguageContext";
import { Loader2, Calendar, Sparkles, AlertCircle } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function GeneratePage() {
  const { t } = useLanguage();
  const [isLoading, setIsLoading] = useState(false);
  const [level, setLevel] = useState<string>("");

  const handleGenerate = async () => {
    if (!level) {
      toast.error(t.home.generate.errorLevel);
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch("/api/schedule/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ level }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success(data.message || t.home.generate.success);
      } else {
        toast.error(data.error || t.home.generate.error);
      }
    } catch (error) {
      toast.error(t.home.generate.errorConnection);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t.home.generate.title}</h1>
        <p className="text-muted-foreground">
          {t.home.generate.subtitle}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <Card className="border-blue-200 bg-blue-50/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="text-blue-600 w-5 h-5" />
              {t.home.generate.autoTitle}
            </CardTitle>
            <CardDescription>
              {t.home.generate.autoDesc}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-medium">{t.home.generate.levelLabel}</label>
              <Select onValueChange={setLevel} value={level}>
                <SelectTrigger>
                  <SelectValue placeholder={t.home.generate.levelPlaceholder} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PRIMARY">{t.home.generate.primaryDesc}</SelectItem>
                  <SelectItem value="SECONDARY">{t.home.generate.secondaryDesc}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <button 
              className="w-full h-12 text-lg font-bold gap-2 bg-slate-900 text-white rounded-md hover:bg-slate-800 disabled:opacity-50 flex items-center justify-center" 
              onClick={handleGenerate}
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin mr-2" />
                  {t.home.generate.buttonGenerating}
                </>
              ) : (
                <>
                  <Calendar className="w-5 h-5 mr-2" />
                  {t.home.generate.buttonStart}
                </>
              )}
            </button>
          </CardContent>
        </Card>

        <Card className="border-amber-200 bg-amber-50/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="text-amber-600 w-5 h-5" />
              {t.home.generate.considerations}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-amber-900 space-y-4">
            <p>
              • {t.home.generate.con1}
            </p>
            <p>
              • {t.home.generate.con2}
            </p>
            <p>
              • {t.home.generate.con3}
            </p>
            <p>
              • {t.home.generate.con4}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
