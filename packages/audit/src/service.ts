import { AuditRepository } from "./repository.js";
import { reconstructChain } from "./reconstruct.js";

export class AuditService {
  constructor(private repo: AuditRepository) {}

  async validateTenantChain(tenantId: string) {
    const nodes = await this.repo.loadTenantChain(tenantId);
    return reconstructChain(nodes);
  }
}
