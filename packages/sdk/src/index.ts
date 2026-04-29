export class TicketBAIClient {
  constructor(private config: { baseUrl: string; apiKey: string; tenantId: string }) {}

  private headers() {
    return {
      Authorization: `Bearer ${this.config.apiKey}`,
      "X-Tenant-Id": this.config.tenantId,
      "Content-Type": "application/json"
    };
  }

  async submitInvoice(invoice: any) {
    const res = await fetch(`${this.config.baseUrl}/invoices`, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify(invoice)
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  }

  async getInvoice(id: string) {
    const res = await fetch(`${this.config.baseUrl}/invoices/${id}`, { headers: this.headers() });
    return res.json();
  }
}

export class InvoiceBuilder {
  private invoice: any = { lines: [], vat: [] };

  setNumber(number: string) { this.invoice.invoiceNumber = number; return this; }
  setDate(date: string) { this.invoice.issueDate = date; return this; }
  setCustomer(name: string, nif: string) { this.invoice.customer = { name, nif }; return this; }
  addLine(description: string, quantity: number, unitPrice: number) {
    this.invoice.lines.push({ description, quantity, unitPrice }); return this;
  }
  addVAT(rate: number, base: number) { this.invoice.vat.push({ rate, base }); return this; }
  build() { return this.invoice; }
}
