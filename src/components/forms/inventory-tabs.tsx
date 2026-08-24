"use client";

import { useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  THead,
  TBody,
  TR,
  TH,
  TD,
} from "@/components/ui/table";
import { formatCurrency, toNumber, formatDateTime } from "@/lib/utils";
import { unitLabel, STOCK_MOVEMENT_TYPES } from "@/lib/constants";

interface StockItem {
  id: string;
  name: string;
  currentStock: number | string;
  unit: string;
  averageCost: number | string;
  minStockLevel?: number | string;
  category?: { name: string };
}

interface Movement {
  id: string;
  itemName: string;
  itemType: string;
  movementType: string;
  quantity: number | string;
  unit: string;
  movementDate: Date | string;
}

interface LowStockAlert {
  id: string;
  name: string;
  type: string;
  current: number;
  minimum: number;
  unit: string;
}

interface InventoryTabsProps {
  products: StockItem[];
  rawMaterials: StockItem[];
  packagingMaterials: StockItem[];
  recentMovements: Movement[];
  lowStock: LowStockAlert[];
  totalValue: number;
}

const TABS = [
  { id: "finished", label: "Finished Products" },
  { id: "raw", label: "Raw Materials" },
  { id: "packaging", label: "Packaging" },
  { id: "movements", label: "Movements" },
] as const;

type TabId = (typeof TABS)[number]["id"];

export function InventoryTabs({
  products,
  rawMaterials,
  packagingMaterials,
  recentMovements,
  lowStock,
  totalValue,
}: InventoryTabsProps) {
  const [activeTab, setActiveTab] = useState<TabId>("finished");

  const movementLabel = (type: string) =>
    STOCK_MOVEMENT_TYPES.find((t) => t.value === type)?.label ?? type;

  const renderStockTable = (items: StockItem[], showCategory = false) => (
    <Table>
      <THead>
        <TR>
          <TH>Name</TH>
          {showCategory && <TH>Category</TH>}
          <TH>Stock</TH>
          <TH>Avg Cost</TH>
          <TH>Value</TH>
          <TH>Min Level</TH>
        </TR>
      </THead>
      <TBody>
        {items.map((item) => (
          <TR key={item.id}>
            <TD className="font-medium">{item.name}</TD>
            {showCategory && <TD>{item.category?.name ?? "—"}</TD>}
            <TD>
              {toNumber(item.currentStock)} {unitLabel(item.unit)}
            </TD>
            <TD>{formatCurrency(item.averageCost)}</TD>
            <TD>
              {formatCurrency(
                toNumber(item.currentStock) * toNumber(item.averageCost)
              )}
            </TD>
            <TD>
              {item.minStockLevel != null
                ? `${toNumber(item.minStockLevel)} ${unitLabel(item.unit)}`
                : "—"}
            </TD>
          </TR>
        ))}
      </TBody>
    </Table>
  );

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <p className="text-sm text-slate-500">Total Inventory Value</p>
        <p className="text-2xl font-bold text-slate-900">
          {formatCurrency(totalValue)}
        </p>
      </div>

      {lowStock.length > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
          <p className="mb-2 text-sm font-semibold text-amber-800">
            Low Stock Alerts ({lowStock.length})
          </p>
          <div className="flex flex-wrap gap-2">
            {lowStock.map((alert) => (
              <Badge key={`${alert.type}-${alert.id}`} variant="warning">
                {alert.name}: {alert.current}/{alert.minimum}{" "}
                {unitLabel(alert.unit)}
              </Badge>
            ))}
          </div>
        </div>
      )}

      <div className="border-b border-slate-200">
        <nav className="-mb-px flex gap-4">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`border-b-2 px-1 py-3 text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? "border-rose-500 text-rose-600"
                  : "border-transparent text-slate-500 hover:text-slate-700"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {activeTab === "finished" && renderStockTable(products, true)}
      {activeTab === "raw" && renderStockTable(rawMaterials)}
      {activeTab === "packaging" && renderStockTable(packagingMaterials)}
      {activeTab === "movements" && (
        <Table>
          <THead>
            <TR>
              <TH>Date</TH>
              <TH>Item</TH>
              <TH>Type</TH>
              <TH>Movement</TH>
              <TH>Quantity</TH>
            </TR>
          </THead>
          <TBody>
            {recentMovements.map((m) => (
              <TR key={m.id}>
                <TD>{formatDateTime(m.movementDate)}</TD>
                <TD>{m.itemName}</TD>
                <TD>{m.itemType.replace("_", " ")}</TD>
                <TD>{movementLabel(m.movementType)}</TD>
                <TD>
                  {toNumber(m.quantity) > 0 ? "+" : ""}
                  {toNumber(m.quantity)} {unitLabel(m.unit)}
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>
      )}

      <div className="flex gap-4 text-sm">
        <Link href="/products" className="text-rose-600 hover:underline">
          Manage Products
        </Link>
        <Link href="/raw-materials" className="text-rose-600 hover:underline">
          Raw Materials
        </Link>
        <Link href="/packaging" className="text-rose-600 hover:underline">
          Packaging
        </Link>
      </div>
    </div>
  );
}
