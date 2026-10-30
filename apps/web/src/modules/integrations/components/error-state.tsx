"use client";

import { motion } from "framer-motion";
import { RefreshCw, AlertCircle } from "lucide-react";
import { Card, Button } from "@lucreii/ui";
import { ApiClientError } from "@/lib/api/client";
import { SessionExpiredRedirect } from "@/components/session-expired-redirect";

interface ErrorStateProps {
  error: Error;
  onRetry: () => void;
}

export function ErrorState({ error, onRetry }: ErrorStateProps) {
  if (error instanceof ApiClientError && error.status === 401) {
    return <SessionExpiredRedirect />;
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex min-h-[400px] items-center justify-center"
    >
      <Card variant="outlined" className="max-w-md p-8 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-error/10">
          <AlertCircle className="h-6 w-6 text-error" />
        </div>
        <h3 className="mb-2 text-lg font-semibold text-foreground">
          Erro ao carregar dados
        </h3>
        <p className="mb-6 text-sm text-muted-foreground">
          Não foi possível carregar os dados de integrações. Tente novamente.
        </p>
        <Button onClick={onRetry}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Tentar novamente
        </Button>
      </Card>
    </motion.div>
  );
}
