import { describe, expect, it } from "vitest";
import { parseWooCommerceCsv } from "./catalog";

describe("parseWooCommerceCsv", () => {
  it("maps common WooCommerce product columns into linked marketplace products", () => {
    const result = parseWooCommerceCsv(`SKU,Name,Categories,Regular price,Sale price,Stock,Images,Description,Supplier,External URL,Button text,Published
CEM-50,Cement 50kg,"Cement > Portland",850,799,240,https://images.example.com/cement.jpg,"General-purpose, 50kg bag",Atlas Hardware,https://supplier.example.com/cement-50kg,Visit supplier,1`);

    expect(result).toMatchObject({ totalRows: 1, skippedRows: 0, errors: [] });
    expect(result.products).toEqual([expect.objectContaining({
      sku: "CEM-50",
      title: "Cement 50kg",
      category: "Cement",
      priceKes: 850,
      salePriceKes: 799,
      availableQuantity: 240,
      imageUrl: "https://images.example.com/cement.jpg",
      externalUrl: "https://supplier.example.com/cement-50kg",
      buttonText: "Visit supplier",
      status: "active",
    })]);
  });

  it("skips rows with missing titles or unsafe product links while retaining valid rows", () => {
    const result = parseWooCommerceCsv(`Name,SKU,External URL,Price,Stock
Rebar D12,REB-12,https://supplier.example.com/rebar,1200,0
,NO-NAME,https://supplier.example.com/missing,500,5
Unsafe cable,CAB-01,javascript:alert(1),200,8`);

    expect(result.products).toHaveLength(1);
    expect(result.products[0]).toMatchObject({ title: "Rebar D12", status: "out_of_stock" });
    expect(result.skippedRows).toBe(2);
    expect(result.errors).toHaveLength(2);
  });

  it("requires a recognizable product title header", () => {
    expect(() => parseWooCommerceCsv("SKU,External URL\nSAMPLE-1,https://supplier.example.com/item")).toThrow("product title column is required");
  });

  it("derives supplier product links for a Wajenzi WooCommerce export with image-host evidence", () => {
    const result = parseWooCommerceCsv(`Name,ID,SKU,Images,Regular price,Published
    Work Gloves,10960,GLV-43,https://wajenzistores.com/wp-content/uploads/2023/10/gloves.jpg,450,1`);

    expect(result).toMatchObject({ totalRows: 1, skippedRows: 0 });
    expect(result.products[0]).toMatchObject({
      externalUrl: "https://wajenzistores.com/?p=10960",
      imageUrl: "https://wajenzistores.com/wp-content/uploads/2023/10/gloves.jpg",
      status: "active",
    });
  });

  it("caps unusually large stock values at the database integer limit", () => {
    const result = parseWooCommerceCsv(`Name,SKU,External URL,Price,Stock
    Bulk aggregate,AGG-999,https://supplier.example.com/aggregate,1200,9999999999999`);

    expect(result.products[0]).toMatchObject({ availableQuantity: 2_147_483_647 });
  });
});
