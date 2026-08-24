# Sweet Fusion - Database Architecture

## 1. Recommended Database Architecture

The schema uses a **lot-based inventory model** with a unified **InventoryMovement** audit trail. Every stock change creates a movement record linked to its source transaction (purchase, production, packaging, sale, etc.).

### Core Entity Groups

| Group | Entities |
|-------|----------|
| Master Data | ProductCategory, Product, Supplier, Customer, RawMaterial, PackagingMaterial |
| Procurement | Purchase, PurchaseItem, Payment |
| Production | Recipe, RecipeIngredient, ProductionBatch, ProductionBatchIngredient |
| Packaging | PackagingOperation, PackagingOperationMaterial |
| Inventory | ProductLot, InventoryMovement, Stock snapshots on master records |
| Sales | SalesOrder, SalesOrderItem, WholesaleSupply, WholesaleSupplyItem |
| Finance | Expense, Payment |
| Config | AppSettings |

## 2. Entity Relationships

```
Supplier ──< Purchase ──< PurchaseItem ──> Product | RawMaterial | PackagingMaterial
                                              │
                                              └──> ProductLot (finished goods lots)
                                              └──> InventoryMovement

Product ──< Recipe ──< RecipeIngredient ──> RawMaterial
   │
   └──< ProductionBatch ──< ProductionBatchIngredient ──> RawMaterial
              │
              └──> ProductLot
              └──> InventoryMovement

ProductLot ──< PackagingOperation ──< PackagingOperationMaterial ──> PackagingMaterial
                    │
                    └──> ProductLot (packaged output lot with combined cost)

Customer ──< SalesOrder ──< SalesOrderItem ──> Product
         ──< WholesaleSupply ──< WholesaleSupplyItem ──> Product

Payment ──> Supplier | Customer (via entityType + entityId)
Expense ──> optional link to ProductionBatch or Product
```

### Key Relationships

- **Product** has `type`: PURCHASED (resale) or MANUFACTURED (produced in-house)
- **PurchaseItem** is polymorphic via `itemType`: FINISHED_PRODUCT, RAW_MATERIAL, PACKAGING
- **ProductLot** tracks batch-level finished goods with full cost breakdown
- **InventoryMovement** provides complete stock history for all item types
- **Payment** tracks both supplier payables and customer receivables

## 3. Inventory Flow

### Purchased Product Flow
```
Supplier → Purchase → PurchaseItem → ProductLot created
                                    → Product.currentStock +=
                                    → InventoryMovement (PURCHASE)
→ PackagingOperation → deduct PackagingMaterial stock
                     → create new ProductLot with packaging cost
                     → InventoryMovement (PACKAGING)
→ SalesOrder/WholesaleSupply → deduct Product.currentStock
                              → InventoryMovement (SALE/WHOLESALE)
```

### Manufactured Product Flow
```
Supplier → Purchase → RawMaterial stock +=
Recipe defines ingredient quantities per batch
ProductionBatch → deduct RawMaterial stock (InventoryMovement PRODUCTION_OUT)
               → create ProductLot with production cost
               → Product.currentStock += (InventoryMovement PRODUCTION_IN)
→ PackagingOperation → same as above
→ Sale → deduct stock
```

### Stock Movement Types
- PURCHASE, PRODUCTION_IN, PRODUCTION_OUT, PACKAGING_IN, PACKAGING_OUT
- SALE, WHOLESALE, RETURN, ADJUSTMENT, DAMAGE

## 4. Product Costing Strategy

### Purchased Product
```
Final Cost = Purchase Unit Cost + Packaging Cost Per Unit + Allocated Transport/Other
```

Costs are **frozen at transaction time** on PurchaseItem and PackagingOperationMaterial records.

### Manufactured Product
```
Production Cost = Σ(ingredient qty × unit cost at production time) + Labour + Other expenses
Final Cost = Production Cost Per Unit + Packaging Cost Per Unit
```

### Profit Calculation
```
Retail Profit = Selling Price − Final Cost Per Unit
Wholesale Profit = Wholesale Price − Final Cost Per Unit
Margin % = (Profit / Selling Price) × 100
```

ProductLot stores `purchaseCost`, `productionCost`, `packagingCost`, and `unitCost` (total) for accurate historical costing even when supplier prices change.

## 5. Development Plan

1. ✅ Prisma schema + migrations + seed data
2. ✅ Core services (inventory, costing, payments)
3. ✅ Layout + shared UI components
4. ✅ Dashboard with charts and date filters
5. ✅ Master data modules (Products, Suppliers, Customers)
6. ✅ Purchase, Raw Materials, Packaging modules
7. ✅ Recipes + Production batches
8. ✅ Inventory + Traceability
9. ✅ Orders, Wholesale, Payments, Expenses
10. ✅ Reports with CSV export
