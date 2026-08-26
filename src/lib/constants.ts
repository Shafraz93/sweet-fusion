export const UNITS = [
  { value: "PIECES", label: "Pieces" },
  { value: "PACKETS", label: "Packets" },
  { value: "KILOGRAMS", label: "Kilograms" },
  { value: "GRAMS", label: "Grams" },
  { value: "BOXES", label: "Boxes" },
  { value: "BOTTLES", label: "Bottles" },
  { value: "LITERS", label: "Liters" },
  { value: "MILLILITERS", label: "Milliliters" },
] as const;

export const PRODUCT_TYPES = [
  { value: "PURCHASED", label: "Purchased / Resale" },
  { value: "MANUFACTURED", label: "Manufactured / Produced" },
] as const;

export const CUSTOMER_TYPES = [
  { value: "RETAIL", label: "Retail Customer" },
  { value: "SHOP", label: "Shop" },
  { value: "WHOLESALE", label: "Wholesale Customer" },
] as const;

export const PAYMENT_STATUSES = [
  { value: "PAID", label: "Paid", color: "green" },
  { value: "PARTIAL", label: "Partially Paid", color: "yellow" },
  { value: "UNPAID", label: "Unpaid", color: "red" },
] as const;

export const EXPENSE_CATEGORIES = [
  { value: "TRANSPORT", label: "Transport" },
  { value: "DELIVERY", label: "Delivery" },
  { value: "ADVERTISING", label: "Advertising" },
  { value: "ELECTRICITY", label: "Electricity" },
  { value: "RENT", label: "Rent" },
  { value: "LABOUR", label: "Labour" },
  { value: "EQUIPMENT", label: "Equipment" },
  { value: "FACEBOOK_ADS", label: "Facebook Ads" },
  { value: "INSTAGRAM_ADS", label: "Instagram Ads" },
  { value: "WHATSAPP_PROMO", label: "WhatsApp Promotions" },
  { value: "PRINTING", label: "Printing" },
  { value: "MARKETING", label: "Marketing" },
  { value: "MISCELLANEOUS", label: "Miscellaneous" },
] as const;

export const STOCK_MOVEMENT_TYPES = [
  { value: "PURCHASE", label: "Purchase" },
  { value: "PRODUCTION_IN", label: "Production In" },
  { value: "PRODUCTION_OUT", label: "Production Out" },
  { value: "PACKAGING_IN", label: "Packaging In" },
  { value: "PACKAGING_OUT", label: "Packaging Out" },
  { value: "SALE", label: "Sale" },
  { value: "WHOLESALE", label: "Wholesale" },
  { value: "RETURN", label: "Return" },
  { value: "ADJUSTMENT", label: "Adjustment" },
  { value: "DAMAGE", label: "Damage/Wastage" },
] as const;

export const NAV_ITEMS = [
  { href: "/", label: "Dashboard", icon: "LayoutDashboard" },
  { href: "/products", label: "Products", icon: "Package" },
  { href: "/suppliers", label: "Suppliers", icon: "Truck" },
  { href: "/customers", label: "Customers", icon: "Users" },
  { href: "/purchases", label: "Purchases", icon: "ShoppingCart" },
  { href: "/raw-materials", label: "Raw Materials", icon: "Wheat" },
  { href: "/packaging", label: "Packaging", icon: "Box" },
  { href: "/recipes", label: "Recipes", icon: "BookOpen" },
  { href: "/production", label: "Production", icon: "Factory" },
  { href: "/inventory", label: "Inventory", icon: "Warehouse" },
  { href: "/orders", label: "Orders & Sales", icon: "Receipt" },
  { href: "/payments", label: "Payments", icon: "CreditCard" },
  { href: "/expenses", label: "Expenses", icon: "Wallet" },
  { href: "/reports", label: "Reports", icon: "BarChart3" },
  { href: "/settings", label: "Settings", icon: "Settings" },
] as const;

export function unitLabel(unit: string): string {
  return UNITS.find((u) => u.value === unit)?.label ?? unit;
}

export function paymentStatusColor(status: string): string {
  switch (status) {
    case "PAID":
      return "bg-emerald-100 text-emerald-800";
    case "PARTIAL":
      return "bg-amber-100 text-amber-800";
    default:
      return "bg-red-100 text-red-800";
  }
}
