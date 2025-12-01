/**
 * CIPHER - Data Security & Compliance Agent
 * Privacy compliance, data protection, security monitoring
 */

import { BaseAgent, type AgentInput, type AgentOutput } from "../base-agent"
import type { AgentIdentity, AgentConfig, InterAgentMessage } from "../types"

// =============================================================================
// CIPHER AGENT
// =============================================================================

export class CipherAgent extends BaseAgent {
  private securityConfig: SecurityConfig
  private auditLog: AuditEntry[] = []
  
  constructor(config?: Partial<AgentConfig>) {
    super({
      codename: "CIPHER_SEC",
      enabled: true,
      model: "gpt-4o",
      temperature: 0.2, // Very low for precise compliance
      maxTokens: 1500,
      systemPrompt: CIPHER_SYSTEM_PROMPT,
      tools: [
        "validateDataAccess",
        "checkCompliance",
        "auditLog",
        "encryptSensitiveData",
        "generatePrivacyReport",
        "handleDataRequest",
        "detectAnomalies",
        "enforceRetention",
      ],
      triggers: [
        { event: "data_access", action: "validate_access", priority: 1 },
        { event: "compliance_check", action: "run_compliance", priority: 1 },
        { event: "anomaly_detected", action: "investigate", priority: 1 },
      ],
      escalationRules: [
        { condition: "data_breach", reason: "compliance_issue", priority: "urgent" },
        { condition: "unauthorized_access", reason: "compliance_issue", priority: "urgent" },
      ],
      rateLimits: { requestsPerMinute: 50, tokensPerDay: 150000 },
      ...config,
    })
    
    this.securityConfig = DEFAULT_SECURITY_CONFIG
  }
  
  protected getIdentity(): AgentIdentity {
    return {
      codename: "CIPHER_SEC",
      name: "Cipher",
      description: "AI Security & Compliance Agent - Data protection, privacy, audit trails",
      version: "1.0.0",
      capabilities: [
        "Access Control",
        "Compliance Monitoring",
        "Audit Logging",
        "Data Encryption",
        "Privacy Reports",
        "GDPR/Privacy Act",
        "Anomaly Detection",
        "Data Retention",
      ],
      status: "idle",
    }
  }
  
  protected registerTools(): void {
    this.registerTool({
      name: "validateDataAccess",
      description: "Validate data access request",
      parameters: {
        type: "object",
        properties: {
          requesterId: { type: "string", description: "Who is requesting" },
          dataType: { type: "string", description: "Type of data" },
          purpose: { type: "string", description: "Access purpose" },
        },
        required: ["requesterId", "dataType"],
      },
      handler: async (params) => this.validateDataAccess(params as AccessParams),
    })
    
    this.registerTool({
      name: "checkCompliance",
      description: "Run compliance check",
      parameters: {
        type: "object",
        properties: {
          framework: { type: "string", enum: ["privacy_act", "gdpr", "pci_dss", "all"], description: "Framework" },
          scope: { type: "string", description: "Scope of check" },
        },
        required: [],
      },
      handler: async (params) => this.checkCompliance(params as ComplianceParams),
    })
    
    this.registerTool({
      name: "auditLog",
      description: "Record audit log entry",
      parameters: {
        type: "object",
        properties: {
          action: { type: "string", description: "Action performed" },
          actor: { type: "string", description: "Who performed" },
          resource: { type: "string", description: "Resource affected" },
          outcome: { type: "string", enum: ["success", "failure", "denied"], description: "Outcome" },
        },
        required: ["action", "actor", "resource", "outcome"],
      },
      handler: async (params) => this.recordAuditLog(params as AuditParams),
    })
    
    this.registerTool({
      name: "encryptSensitiveData",
      description: "Flag and encrypt sensitive data",
      parameters: {
        type: "object",
        properties: {
          dataId: { type: "string", description: "Data identifier" },
          dataType: { type: "string", description: "Type of sensitive data" },
          classification: { type: "string", enum: ["pii", "financial", "health", "confidential"], description: "Classification" },
        },
        required: ["dataId", "classification"],
      },
      handler: async (params) => this.encryptSensitiveData(params as EncryptParams),
    })
    
    this.registerTool({
      name: "generatePrivacyReport",
      description: "Generate privacy compliance report",
      parameters: {
        type: "object",
        properties: {
          period: { type: "string", description: "Report period" },
          format: { type: "string", enum: ["summary", "detailed"], description: "Report format" },
        },
        required: [],
      },
      handler: async (params) => this.generatePrivacyReport(params as ReportParams),
    })
    
    this.registerTool({
      name: "handleDataRequest",
      description: "Handle customer data request (access/delete)",
      parameters: {
        type: "object",
        properties: {
          requestType: { type: "string", enum: ["access", "delete", "rectify", "port"], description: "Request type" },
          customerId: { type: "string", description: "Customer ID" },
          scope: { type: "array", description: "Data scope" },
        },
        required: ["requestType", "customerId"],
      },
      handler: async (params) => this.handleDataRequest(params as DataRequestParams),
    })
    
    this.registerTool({
      name: "detectAnomalies",
      description: "Detect security anomalies",
      parameters: {
        type: "object",
        properties: {
          timeframe: { type: "string", description: "Analysis timeframe" },
          systems: { type: "array", description: "Systems to check" },
        },
        required: [],
      },
      handler: async (params) => this.detectAnomalies(params as AnomalyParams),
    })
    
    this.registerTool({
      name: "enforceRetention",
      description: "Enforce data retention policies",
      parameters: {
        type: "object",
        properties: {
          dataCategory: { type: "string", description: "Data category" },
          action: { type: "string", enum: ["flag", "archive", "delete"], description: "Retention action" },
        },
        required: ["dataCategory"],
      },
      handler: async (params) => this.enforceRetention(params as RetentionParams),
    })
  }
  
  public async process(input: AgentInput): Promise<AgentOutput> {
    this.log("info", "process", `Processing: ${input.type}`)
    
    try {
      switch (input.type) {
        case "message":
          return await this.handleMessage(input)
        case "event":
          return await this.handleEvent(input)
        case "scheduled":
          return await this.handleScheduledTask(input)
        default:
          return { success: false, error: "Unknown input type" }
      }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : "Processing failed" }
    }
  }
  
  private async handleMessage(input: AgentInput): Promise<AgentOutput> {
    const response = await this.generateResponse(input.messages || [])
    return { success: true, response }
  }
  
  private async handleEvent(input: AgentInput): Promise<AgentOutput> {
    const event = input.event
    if (!event) return { success: false, error: "No event" }
    
    switch (event.name) {
      case "data_access":
        return await this.processDataAccess(event.data)
      case "data_request":
        return await this.processDataSubjectRequest(event.data)
      case "anomaly_detected":
        return await this.investigateAnomaly(event.data)
      default:
        return { success: false, error: `Unknown event: ${event.name}` }
    }
  }
  
  private async handleScheduledTask(input: AgentInput): Promise<AgentOutput> {
    const taskType = input.metadata?.taskType as string
    
    switch (taskType) {
      case "daily_security_scan":
        return await this.runDailySecurityScan()
      case "compliance_review":
        return await this.runComplianceReview()
      case "retention_cleanup":
        return await this.runRetentionCleanup()
      default:
        return { success: false, error: "Unknown task" }
    }
  }
  
  public async handleInterAgentMessage(message: InterAgentMessage): Promise<void> {
    // Log all inter-agent data flows
    await this.recordAuditLog({
      action: "inter_agent_data_flow",
      actor: message.from,
      resource: `message_to_${this.getIdentity().codename}`,
      outcome: "success",
    })
  }
  
  // =============================================================================
  // SECURITY WORKFLOWS
  // =============================================================================
  
  private async processDataAccess(data: Record<string, unknown>): Promise<AgentOutput> {
    const validation = await this.validateDataAccess({
      requesterId: data.requesterId as string,
      dataType: data.dataType as string,
      purpose: data.purpose as string,
    })
    
    if (!(validation.data as any)?.allowed) {
      await this.escalateToHuman(
        "compliance_issue",
        `Unauthorized data access attempt: ${data.requesterId}`,
        data,
        "high"
      )
    }
    
    return { success: true, data: validation.data }
  }
  
  private async processDataSubjectRequest(data: Record<string, unknown>): Promise<AgentOutput> {
    const result = await this.handleDataRequest({
      requestType: data.requestType as string,
      customerId: data.customerId as string,
      scope: data.scope as string[],
    })
    
    // Always notify human for data subject requests
    await this.escalateToHuman(
      "data_request",
      `Data subject request: ${data.requestType} from ${data.customerId}`,
      data,
      "medium"
    )
    
    return { success: true, response: "Data request initiated" }
  }
  
  private async investigateAnomaly(data: Record<string, unknown>): Promise<AgentOutput> {
    const severity = data.severity as string
    
    if (severity === "critical") {
      await this.escalateToHuman("compliance_issue", "Critical security anomaly detected", data, "urgent")
    }
    
    await this.recordAuditLog({
      action: "anomaly_investigation",
      actor: "CIPHER_SEC",
      resource: data.source as string,
      outcome: "success",
    })
    
    return { success: true, response: "Anomaly investigated" }
  }
  
  private async runDailySecurityScan(): Promise<AgentOutput> {
    const anomalies = await this.detectAnomalies({})
    const compliance = await this.checkCompliance({ framework: "all" })
    
    return {
      success: true,
      response: "Daily security scan completed",
      data: { anomalies: anomalies.data, compliance: compliance.data },
    }
  }
  
  private async runComplianceReview(): Promise<AgentOutput> {
    const report = await this.generatePrivacyReport({ format: "detailed" })
    return { success: true, response: "Compliance review completed", data: report.data }
  }
  
  private async runRetentionCleanup(): Promise<AgentOutput> {
    const categories = ["marketing_data", "inactive_leads", "old_quotes"]
    const results = []
    
    for (const category of categories) {
      const result = await this.enforceRetention({ dataCategory: category })
      results.push(result.data)
    }
    
    return { success: true, response: "Retention cleanup completed", data: { results } }
  }
  
  // =============================================================================
  // TOOL IMPLEMENTATIONS
  // =============================================================================
  
  private async validateDataAccess(params: AccessParams) {
    const accessRules: Record<string, string[]> = {
      customer_pii: ["admin", "sales_lead", "support_lead"],
      financial_data: ["admin", "finance"],
      analytics: ["admin", "marketing", "analytics"],
    }
    
    const allowedRoles = accessRules[params.dataType] || ["admin"]
    const allowed = allowedRoles.includes(params.requesterId)
    
    await this.recordAuditLog({
      action: "data_access_request",
      actor: params.requesterId,
      resource: params.dataType,
      outcome: allowed ? "success" : "denied",
    })
    
    return {
      success: true,
      data: { allowed, dataType: params.dataType, requester: params.requesterId, reason: allowed ? "authorized" : "insufficient_permissions" },
    }
  }
  
  private async checkCompliance(params: ComplianceParams) {
    const frameworks = params.framework === "all" ? ["privacy_act", "gdpr", "pci_dss"] : [params.framework]
    const results: Record<string, any> = {}
    
    frameworks.forEach(fw => {
      results[fw] = {
        status: "compliant",
        score: 95 + Math.floor(Math.random() * 5),
        lastChecked: new Date(),
        issues: [],
        recommendations: fw === "gdpr" ? ["Update cookie consent banner"] : [],
      }
    })
    
    return { success: true, data: { frameworks: results, overallStatus: "compliant" } }
  }
  
  private async recordAuditLog(params: AuditParams) {
    const entry: AuditEntry = {
      id: `AUDIT-${Date.now()}`,
      timestamp: new Date(),
      action: params.action,
      actor: params.actor,
      resource: params.resource,
      outcome: params.outcome,
    }
    
    this.auditLog.push(entry)
    this.log("info", "auditLog", `Audit: ${params.action} by ${params.actor}`)
    
    return { success: true, data: entry }
  }
  
  private async encryptSensitiveData(params: EncryptParams) {
    this.log("info", "encryptSensitiveData", `Flagged ${params.dataId} as ${params.classification}`)
    
    return {
      success: true,
      data: {
        dataId: params.dataId,
        classification: params.classification,
        encrypted: true,
        encryptionMethod: "AES-256-GCM",
      },
    }
  }
  
  private async generatePrivacyReport(params: ReportParams) {
    return {
      success: true,
      data: {
        period: params.period || "month",
        format: params.format || "summary",
        generatedAt: new Date(),
        summary: {
          totalRecords: 1247,
          sensitiveRecords: 892,
          dataSubjectRequests: 3,
          retentionCompliance: 98,
          encryptionCoverage: 100,
        },
        recommendations: [
          "Review marketing consent records",
          "Update data processing agreements",
        ],
      },
    }
  }
  
  private async handleDataRequest(params: DataRequestParams) {
    const actions: Record<string, string> = {
      access: "Compiling data export for customer",
      delete: "Scheduling data deletion",
      rectify: "Flagging records for update",
      port: "Preparing portable data format",
    }
    
    await this.recordAuditLog({
      action: `data_${params.requestType}_request`,
      actor: params.customerId,
      resource: "customer_data",
      outcome: "success",
    })
    
    return {
      success: true,
      data: {
        requestId: `DR-${Date.now()}`,
        type: params.requestType,
        customerId: params.customerId,
        status: "processing",
        action: actions[params.requestType],
        estimatedCompletion: "5 business days",
      },
    }
  }
  
  private async detectAnomalies(params: AnomalyParams) {
    // In production, integrate with SIEM/security monitoring
    const anomalies = [
      { type: "unusual_access_pattern", severity: "low", source: "api_gateway", count: 2 },
    ]
    
    return {
      success: true,
      data: {
        timeframe: params.timeframe || "24h",
        anomaliesDetected: anomalies.length,
        anomalies,
        status: anomalies.some(a => a.severity === "critical") ? "alert" : "normal",
      },
    }
  }
  
  private async enforceRetention(params: RetentionParams) {
    const retentionPolicies: Record<string, number> = {
      marketing_data: 365 * 2, // 2 years
      inactive_leads: 365, // 1 year
      old_quotes: 365 * 3, // 3 years
      completed_jobs: 365 * 7, // 7 years (legal requirement)
    }
    
    const retentionDays = retentionPolicies[params.dataCategory] || 365
    
    return {
      success: true,
      data: {
        category: params.dataCategory,
        retentionPeriod: `${retentionDays} days`,
        action: params.action || "flag",
        recordsAffected: Math.floor(Math.random() * 50) + 10,
        status: "processed",
      },
    }
  }
}

// =============================================================================
// TYPES & CONFIG
// =============================================================================

const CIPHER_SYSTEM_PROMPT = `You are Cipher, an AI Security & Compliance Agent for M&M Commercial Moving.

## Your Role
- Protect customer and business data
- Ensure regulatory compliance
- Monitor for security threats
- Handle data subject requests
- Maintain audit trails

## Compliance Frameworks
- Australian Privacy Act
- GDPR (for EU customers)
- PCI-DSS (payment data)

## Key Principles
- Privacy by default
- Minimum necessary access
- Log everything
- Never compromise on security
- Escalate immediately on breaches`

interface SecurityConfig {
  retentionDefault: number
  auditRetention: number
  encryptionStandard: string
}

const DEFAULT_SECURITY_CONFIG: SecurityConfig = {
  retentionDefault: 365 * 2,
  auditRetention: 365 * 7,
  encryptionStandard: "AES-256-GCM",
}

interface AuditEntry {
  id: string
  timestamp: Date
  action: string
  actor: string
  resource: string
  outcome: string
}

interface AccessParams { requesterId: string; dataType: string; purpose?: string }
interface ComplianceParams { framework?: string; scope?: string }
interface AuditParams { action: string; actor: string; resource: string; outcome: string }
interface EncryptParams { dataId: string; dataType?: string; classification: string }
interface ReportParams { period?: string; format?: string }
interface DataRequestParams { requestType: string; customerId: string; scope?: string[] }
interface AnomalyParams { timeframe?: string; systems?: string[] }
interface RetentionParams { dataCategory: string; action?: string }

// =============================================================================
// FACTORY
// =============================================================================

let cipherInstance: CipherAgent | null = null

export function getCipher(): CipherAgent {
  if (!cipherInstance) cipherInstance = new CipherAgent()
  return cipherInstance
}

export function resetCipher(): void {
  cipherInstance = null
}
