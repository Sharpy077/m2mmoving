import type { LucideIcon } from "lucide-react"
import { Building2, Server, Cpu } from "lucide-react"

export interface MoveTypeConfig {
  id: string
  name: string
  icon: LucideIcon
  baseRate: number
  perSqm: number
  code: string
  minSqm: number
  description: string
  minRequirements: string[]
  included: string[]
  idealFor: string[]
  typicalDuration: string
}

export interface AdditionalServiceConfig {
  id: string
  name: string
  price: number
  description: string
}

export const moveTypes: MoveTypeConfig[] = [
  {
    id: "office",
    name: "Office Relocation",
    icon: Building2,
    baseRate: 2500,
    perSqm: 45,
    code: "OFF-REL",
    minSqm: 20,
    description:
      "Complete office moves including workstations, furniture, and equipment. Our team handles everything from packing to setup at your new location.",
    minRequirements: [
      "Minimum 20 sqm office space",
      "2 weeks advance booking recommended",
      "Building access coordination required",
    ],
    included: [
      "Workstation disassembly & reassembly",
      "IT equipment handling",
      "Furniture protection & wrapping",
      "Labeling & inventory system",
      "Weekend/after-hours moves available",
    ],
    idealFor: ["Corporate offices", "Co-working spaces", "Professional services firms"],
    typicalDuration: "1-3 days depending on size",
  },
  {
    id: "datacenter",
    name: "Data Center Migration",
    icon: Server,
    baseRate: 5000,
    perSqm: 85,
    code: "DC-MIG",
    minSqm: 50,
    description:
      "Specialized data centre relocations with anti-static handling and careful planning for mission-critical infrastructure.",
    minRequirements: [
      "Technical site assessment required",
      "4 weeks minimum planning period",
      "Detailed asset inventory",
      "Downtime window scheduling",
    ],
    included: [
      "Anti-static equipment handling",
      "Secure transport vehicles",
      "Cable management & documentation",
      "Rack disassembly & reassembly",
      "Project coordination",
    ],
    idealFor: ["Data centres", "Server rooms", "Network operations centres"],
    typicalDuration: "3-7 days with staged migration",
  },
  {
    id: "it-equipment",
    name: "IT Equipment Transport",
    icon: Cpu,
    baseRate: 1500,
    perSqm: 35,
    code: "IT-TRN",
    minSqm: 10,
    description:
      "Safe transport of computers, servers, networking equipment, and peripherals with proper packaging and handling protocols.",
    minRequirements: ["Equipment inventory list", "1 week advance booking", "Power-down coordination"],
    included: [
      "Anti-static packaging",
      "Individual item tracking",
      "Secure chain of custody",
      "Setup assistance at destination",
      "Equipment testing support",
    ],
    idealFor: ["IT departments", "Tech companies", "Equipment refreshes"],
    typicalDuration: "1-2 days",
  },
]

export const additionalServices: AdditionalServiceConfig[] = [
  {
    id: "packing",
    name: "Professional Packing",
    price: 450,
    description: "Full packing service with quality materials",
  },
  { id: "storage", name: "Temporary Storage", price: 300, description: "Secure storage per week if needed" },
  { id: "cleaning", name: "Post-Move Cleaning", price: 350, description: "Professional cleaning of old premises" },
  { id: "insurance", name: "Premium Insurance", price: 200, description: "Enhanced coverage up to $100,000" },
  { id: "afterhours", name: "After Hours Service", price: 500, description: "Weekend or evening move scheduling" },
  { id: "itsetup", name: "IT Setup Assistance", price: 600, description: "Help reconnecting IT equipment" },
]
