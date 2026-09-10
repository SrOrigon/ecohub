"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Sparkles, CheckCircle2, Loader2, AlertCircle } from "lucide-react";
import { provisionRealSchoolSetupAction } from "@/actions/setup-school";

export function ProvisionSchoolButton() {
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleProvision = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await provisionRealSchoolSetupAction();
      if (res.error) {
        setErrorMsg(res.error);
      } else {
        setDone(true);
      }
    } catch {
      setErrorMsg("Falha ao inicializar instituição.");
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <div className="inline-flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-800">
        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
        Instituição Inicializada com Sucesso!
      </div>
    );
  }

  return (
    <div className="inline-flex flex-col items-end gap-1">
      <Button
        onClick={handleProvision}
        disabled={loading}
        variant="outline"
        size="sm"
        className="gap-2 border-indigo-200 bg-white font-semibold text-indigo-700 hover:bg-indigo-50"
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin text-indigo-600" />
        ) : (
          <Sparkles className="h-4 w-4 text-indigo-600" />
        )}
        Inicializar dados
      </Button>
      {errorMsg && (
        <p className="flex items-center gap-1 text-xs text-red-600">
          <AlertCircle className="h-3 w-3" />
          {errorMsg}
        </p>
      )}
    </div>
  );
}
