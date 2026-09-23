"use client";

import Link from "next/link";
import { useState } from "react";
import { Trophy } from "lucide-react";
import type { DashboardProfitabilityResponse } from "@lucreii/types";
import { Button, EmptyState, Modal } from "@lucreii/ui";
import { ProductsTable } from "./products-table";

interface ProductRankingModalProps {
  data: DashboardProfitabilityResponse | undefined;
}

function ProductRankingEmptyState() {
  return (
    <EmptyState
      title="Nenhum produto com dados suficientes"
      description="Cadastre produtos e custos para visualizar a lucratividade por item."
      icon={<Trophy className="h-6 w-6" />}
      action={
        <Button asChild variant="secondary">
          <Link href="/app/products">Cadastrar produtos</Link>
        </Button>
      }
    />
  );
}

export function ProductRankingModal({ data }: ProductRankingModalProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        aria-haspopup="dialog"
        onClick={() => setOpen(true)}
        size="sm"
        variant="secondary"
      >
        <Trophy className="h-3.5 w-3.5 text-accent" />
        Ranking de Produtos
      </Button>

      <Modal
        className="!max-w-6xl"
        onClose={() => setOpen(false)}
        open={open}
        title="Ranking de Produtos"
      >
        {data ? (
          <ProductsTable bare data={data} />
        ) : (
          <ProductRankingEmptyState />
        )}
      </Modal>
    </>
  );
}
