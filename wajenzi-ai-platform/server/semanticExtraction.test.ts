import { describe, expect, it } from "vitest";
import * as XLSX from "xlsx";
import { parseSemanticDocument, toWooCommerceCsv, validateSemanticSource } from "./semanticExtraction";

describe("supplier document semantic extraction", () => {
  const source = [
    "Product Name,SKU,Price,Stock,Category,Brand,Unit",
    "Crown Vinyl Matt Emulsion 20L White,CVM-20W,KSh 8,450,12,Paint,Crown,pcs",
    "D12 Reinforcement Bar 12mm,RB-D12,KES 970,8,Steel,BuildSteel,pcs",
  ].join("\n");

  it("validates supported supplier sources and rejects unsupported or empty files", () => {
    expect(() => validateSemanticSource("price-list.csv", "text/csv", Buffer.from(source))).not.toThrow();
    expect(() => validateSemanticSource("price-list.exe", "application/octet-stream", Buffer.from("binary"))).toThrow(/Supported sources/);
    expect(() => validateSemanticSource("empty.csv", "text/csv", Buffer.alloc(0))).toThrow(/empty/);
  });

  it("separates supplier names from normalized construction product values and recognizes KES data", async () => {
    const result = await parseSemanticDocument("supplier-price-list.csv", "text/csv", Buffer.from(source));
    expect(result.documentType).toBe("price_list");
    expect(result.products).toHaveLength(2);
    expect(result.products[0]).toMatchObject({ supplierProductName: "Crown Vinyl Matt Emulsion 20L White", normalizedProductName: "Crown Vinyl Matt Emulsion", sizeValue: "20", sizeUnit: "L", colour: "White", priceKes: 8450, packagingUnit: "PCS", category: "Paint", status: "ready" });
    expect(result.products[1]).toMatchObject({ supplierSku: "RB-D12", priceKes: 970, category: "Steel" });
  });

  it("marks products without verified commercial values as needing review and keeps WooCommerce exports hidden", async () => {
    const result = await parseSemanticDocument("stock.csv", "text/csv", Buffer.from("Product Name,SKU,Stock\nPVC Pipe 25mm,PVC-25,8"));
    expect(result.products[0].status).toBe("needs_review");
    const csv = toWooCommerceCsv([{ ...result.products[0], id: 71, sourceDocumentName: "stock.csv", supplierName: "Example Supplier" }]);
    expect(csv).toContain("Visibility in catalog");
    expect(csv).toContain("-1,hidden");
    expect(csv).toContain("PVC-25");
  });

  it("reads product rows from a workbook after a spreadsheet title row", async () => {
    const workbook = XLSX.utils.book_new();
    const sheet = XLSX.utils.aoa_to_sheet([["August catalogue"], ["Product Name", "SKU", "Price"], ["Tile Adhesive 20kg", "TILE-20", "8,450/-"]]);
    XLSX.utils.book_append_sheet(workbook, sheet, "Products");
    const result = await parseSemanticDocument("catalogue.xlsx", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }));
    expect(result.products).toHaveLength(1);
    expect(result.products[0]).toMatchObject({ supplierSku: "TILE-20", priceKes: 8450, status: "ready" });
  });
});
