"use client"

import type React from "react"

import { useState, useCallback, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Monitor,
  Armchair,
  Archive,
  Users,
  Server,
  Package,
  Plus,
  Minus,
  Check,
  Sparkles,
  ChevronDown,
  ChevronUp,
} from "lucide-react"
import { cn } from "@/lib/utils"

// Item category definitions
export interface InventoryItem {
  id: string
  name: string
  category: string
  icon: React.ReactNode
  sqmEstimate: number // Square meters per item
  description?: string
}

export interface InventorySelection {
  itemId: string
  quantity: number
}

export interface InventoryPickerProps {
  serviceType?: string
  onSelectionComplete: (selections: InventorySelection[], estimatedSqm: number) => void
  onCancel?: () => void
  initialSelections?: InventorySelection[]
  embedded?: boolean
}

// Comprehensive item catalog by category
const ITEM_CATALOG: Record<string, InventoryItem[]> = {
  workstations: [
    {
      id: "desk_standard",
      name: "Standard Desk",
      category: "workstations",
      icon: <Monitor className="h-4 w-4" />,
      sqmEstimate: 2.5,
      description: "Single desk with drawers",
    },
    {
      id: "desk_executive",
      name: "Executive Desk",
      category: "workstations",
      icon: <Monitor className="h-4 w-4" />,
      sqmEstimate: 4,
      description: "Large L-shaped or partner desk",
    },
    {
      id: "workstation_pod",
      name: "Workstation Pod (4)",
      category: "workstations",
      icon: <Monitor className="h-4 w-4" />,
      sqmEstimate: 10,
      description: "4-person cluster workstation",
    },
    {
      id: "reception_desk",
      name: "Reception Desk",
      category: "workstations",
      icon: <Monitor className="h-4 w-4" />,
      sqmEstimate: 5,
      description: "Front desk with counter",
    },
    {
      id: "standing_desk",
      name: "Standing Desk",
      category: "workstations",
      icon: <Monitor className="h-4 w-4" />,
      sqmEstimate: 2,
      description: "Height adjustable desk",
    },
    {
      id: "hot_desk",
      name: "Hot Desk",
      category: "workstations",
      icon: <Monitor className="h-4 w-4" />,
      sqmEstimate: 1.5,
      description: "Simple shared desk",
    },
  ],
  seating: [
    {
      id: "chair_office",
      name: "Office Chair",
      category: "seating",
      icon: <Armchair className="h-4 w-4" />,
      sqmEstimate: 0.5,
      description: "Standard ergonomic chair",
    },
    {
      id: "chair_executive",
      name: "Executive Chair",
      category: "seating",
      icon: <Armchair className="h-4 w-4" />,
      sqmEstimate: 0.7,
      description: "Leather executive chair",
    },
    {
      id: "chair_visitor",
      name: "Visitor Chair",
      category: "seating",
      icon: <Armchair className="h-4 w-4" />,
      sqmEstimate: 0.4,
      description: "Guest seating",
    },
    {
      id: "chair_conference",
      name: "Conference Chair",
      category: "seating",
      icon: <Armchair className="h-4 w-4" />,
      sqmEstimate: 0.5,
      description: "Meeting room chair",
    },
    {
      id: "sofa_2seat",
      name: "2-Seater Sofa",
      category: "seating",
      icon: <Armchair className="h-4 w-4" />,
      sqmEstimate: 2,
      description: "Reception or breakout sofa",
    },
    {
      id: "sofa_3seat",
      name: "3-Seater Sofa",
      category: "seating",
      icon: <Armchair className="h-4 w-4" />,
      sqmEstimate: 3,
      description: "Large breakout sofa",
    },
    {
      id: "stool_bar",
      name: "Bar Stool",
      category: "seating",
      icon: <Armchair className="h-4 w-4" />,
      sqmEstimate: 0.3,
      description: "Kitchen or breakout stool",
    },
  ],
  storage: [
    {
      id: "cabinet_filing_2",
      name: "2-Drawer Filing Cabinet",
      category: "storage",
      icon: <Archive className="h-4 w-4" />,
      sqmEstimate: 0.5,
      description: "Standard under-desk filing",
    },
    {
      id: "cabinet_filing_4",
      name: "4-Drawer Filing Cabinet",
      category: "storage",
      icon: <Archive className="h-4 w-4" />,
      sqmEstimate: 0.7,
      description: "Tall filing cabinet",
    },
    {
      id: "bookshelf",
      name: "Bookshelf",
      category: "storage",
      icon: <Archive className="h-4 w-4" />,
      sqmEstimate: 1,
      description: "Standard bookcase",
    },
    {
      id: "cabinet_storage",
      name: "Storage Cabinet",
      category: "storage",
      icon: <Archive className="h-4 w-4" />,
      sqmEstimate: 1.5,
      description: "Lockable storage cupboard",
    },
    {
      id: "locker_bank",
      name: "Locker Bank (6)",
      category: "storage",
      icon: <Archive className="h-4 w-4" />,
      sqmEstimate: 1.5,
      description: "6-unit staff locker",
    },
    {
      id: "credenza",
      name: "Credenza",
      category: "storage",
      icon: <Archive className="h-4 w-4" />,
      sqmEstimate: 1.2,
      description: "Low storage unit",
    },
    {
      id: "archive_box",
      name: "Archive Boxes (10)",
      category: "storage",
      icon: <Archive className="h-4 w-4" />,
      sqmEstimate: 0.5,
      description: "Packed document boxes",
    },
  ],
  meeting: [
    {
      id: "table_meeting_4",
      name: "Meeting Table (4 person)",
      category: "meeting",
      icon: <Users className="h-4 w-4" />,
      sqmEstimate: 4,
      description: "Small meeting table",
    },
    {
      id: "table_meeting_8",
      name: "Meeting Table (8 person)",
      category: "meeting",
      icon: <Users className="h-4 w-4" />,
      sqmEstimate: 8,
      description: "Standard boardroom table",
    },
    {
      id: "table_meeting_12",
      name: "Meeting Table (12 person)",
      category: "meeting",
      icon: <Users className="h-4 w-4" />,
      sqmEstimate: 12,
      description: "Large boardroom table",
    },
    {
      id: "whiteboard",
      name: "Whiteboard",
      category: "meeting",
      icon: <Users className="h-4 w-4" />,
      sqmEstimate: 0.5,
      description: "Wall-mounted or mobile",
    },
    {
      id: "projector",
      name: "Projector & Screen",
      category: "meeting",
      icon: <Users className="h-4 w-4" />,
      sqmEstimate: 0.3,
      description: "Ceiling or portable",
    },
    {
      id: "tv_display",
      name: "TV/Display Screen",
      category: "meeting",
      icon: <Users className="h-4 w-4" />,
      sqmEstimate: 0.3,
      description: "Wall-mounted display",
    },
    {
      id: "video_conf",
      name: "Video Conference Unit",
      category: "meeting",
      icon: <Users className="h-4 w-4" />,
      sqmEstimate: 0.2,
      description: "Camera and speaker system",
    },
  ],
  it_equipment: [
    {
      id: "computer_desktop",
      name: "Desktop Computer",
      category: "it_equipment",
      icon: <Server className="h-4 w-4" />,
      sqmEstimate: 0.3,
      description: "Tower and monitor",
    },
    {
      id: "computer_laptop",
      name: "Laptop",
      category: "it_equipment",
      icon: <Server className="h-4 w-4" />,
      sqmEstimate: 0.1,
      description: "Packed laptop",
    },
    {
      id: "monitor",
      name: "Monitor",
      category: "it_equipment",
      icon: <Server className="h-4 w-4" />,
      sqmEstimate: 0.2,
      description: "Standalone monitor",
    },
    {
      id: "printer_small",
      name: "Small Printer",
      category: "it_equipment",
      icon: <Server className="h-4 w-4" />,
      sqmEstimate: 0.5,
      description: "Desktop printer",
    },
    {
      id: "printer_mfp",
      name: "Multifunction Printer",
      category: "it_equipment",
      icon: <Server className="h-4 w-4" />,
      sqmEstimate: 1.5,
      description: "Large office MFP",
    },
    {
      id: "server_rack",
      name: "Server Rack",
      category: "it_equipment",
      icon: <Server className="h-4 w-4" />,
      sqmEstimate: 2,
      description: "Full or half rack",
    },
    {
      id: "network_cabinet",
      name: "Network Cabinet",
      category: "it_equipment",
      icon: <Server className="h-4 w-4" />,
      sqmEstimate: 1,
      description: "Switches and patch panels",
    },
    {
      id: "ups",
      name: "UPS Unit",
      category: "it_equipment",
      icon: <Server className="h-4 w-4" />,
      sqmEstimate: 0.5,
      description: "Battery backup",
    },
  ],
  specialty: [
    {
      id: "safe_small",
      name: "Safe (Small)",
      category: "specialty",
      icon: <Package className="h-4 w-4" />,
      sqmEstimate: 0.5,
      description: "Under 100kg",
    },
    {
      id: "safe_large",
      name: "Safe (Large)",
      category: "specialty",
      icon: <Package className="h-4 w-4" />,
      sqmEstimate: 1,
      description: "Over 100kg",
    },
    {
      id: "copier_large",
      name: "Large Copier",
      category: "specialty",
      icon: <Package className="h-4 w-4" />,
      sqmEstimate: 1.5,
      description: "Floor-standing copier",
    },
    {
      id: "plotter",
      name: "Plotter/Wide Format",
      category: "specialty",
      icon: <Package className="h-4 w-4" />,
      sqmEstimate: 2,
      description: "Large format printer",
    },
    {
      id: "vending_machine",
      name: "Vending Machine",
      category: "specialty",
      icon: <Package className="h-4 w-4" />,
      sqmEstimate: 1.5,
      description: "Snack or drink machine",
    },
    {
      id: "kitchen_fridge",
      name: "Kitchen Fridge",
      category: "specialty",
      icon: <Package className="h-4 w-4" />,
      sqmEstimate: 1,
      description: "Office refrigerator",
    },
    {
      id: "kitchen_appliances",
      name: "Kitchen Appliances Set",
      category: "specialty",
      icon: <Package className="h-4 w-4" />,
      sqmEstimate: 0.5,
      description: "Microwave, kettle, etc.",
    },
    {
      id: "artwork_framed",
      name: "Framed Artwork",
      category: "specialty",
      icon: <Package className="h-4 w-4" />,
      sqmEstimate: 0.3,
      description: "Wall art pieces",
    },
    {
      id: "plant_large",
      name: "Large Plant",
      category: "specialty",
      icon: <Package className="h-4 w-4" />,
      sqmEstimate: 0.5,
      description: "Indoor plant",
    },
  ],
}

const CATEGORY_INFO: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  workstations: { label: "Workstations", icon: <Monitor className="h-4 w-4" />, color: "bg-blue-500" },
  seating: { label: "Seating", icon: <Armchair className="h-4 w-4" />, color: "bg-green-500" },
  storage: { label: "Storage", icon: <Archive className="h-4 w-4" />, color: "bg-amber-500" },
  meeting: { label: "Meeting Rooms", icon: <Users className="h-4 w-4" />, color: "bg-purple-500" },
  it_equipment: { label: "IT Equipment", icon: <Server className="h-4 w-4" />, color: "bg-red-500" },
  specialty: { label: "Specialty Items", icon: <Package className="h-4 w-4" />, color: "bg-gray-500" },
}

// Quick estimate presets
const QUICK_ESTIMATES = [
  { id: "small_office", label: "Small Office (5-10 people)", sqm: 80, description: "5-10 desks, basic IT" },
  {
    id: "medium_office",
    label: "Medium Office (20-30 people)",
    sqm: 200,
    description: "20-30 workstations, meeting room",
  },
  {
    id: "large_office",
    label: "Large Office (50+ people)",
    sqm: 500,
    description: "50+ workstations, multiple meeting rooms",
  },
]

export function ItemInventoryPicker({
  serviceType,
  onSelectionComplete,
  onCancel,
  initialSelections = [],
  embedded = false,
}: InventoryPickerProps) {
  const [selections, setSelections] = useState<Map<string, number>>(() => {
    const map = new Map<string, number>()
    initialSelections.forEach((s) => map.set(s.itemId, s.quantity))
    return map
  })
  const [activeCategory, setActiveCategory] = useState("workstations")
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(["workstations"]))
  const [showQuickEstimate, setShowQuickEstimate] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")

  // Calculate totals
  const totals = useMemo(() => {
    let totalItems = 0
    let estimatedSqm = 0
    const categoryCounts: Record<string, number> = {}

    selections.forEach((quantity, itemId) => {
      if (quantity > 0) {
        totalItems += quantity
        // Find item and calculate sqm
        for (const items of Object.values(ITEM_CATALOG)) {
          const item = items.find((i) => i.id === itemId)
          if (item) {
            estimatedSqm += item.sqmEstimate * quantity
            categoryCounts[item.category] = (categoryCounts[item.category] || 0) + quantity
            break
          }
        }
      }
    })

    return { totalItems, estimatedSqm: Math.ceil(estimatedSqm), categoryCounts }
  }, [selections])

  // Update item quantity
  const updateQuantity = useCallback((itemId: string, delta: number) => {
    setSelections((prev) => {
      const newMap = new Map(prev)
      const current = newMap.get(itemId) || 0
      const newValue = Math.max(0, current + delta)
      if (newValue === 0) {
        newMap.delete(itemId)
      } else {
        newMap.set(itemId, newValue)
      }
      return newMap
    })
    setShowQuickEstimate(false)
  }, [])

  // Set exact quantity
  const setQuantity = useCallback((itemId: string, value: number) => {
    setSelections((prev) => {
      const newMap = new Map(prev)
      if (value <= 0) {
        newMap.delete(itemId)
      } else {
        newMap.set(itemId, value)
      }
      return newMap
    })
    setShowQuickEstimate(false)
  }, [])

  // Apply quick estimate
  const applyQuickEstimate = useCallback((estimateId: string) => {
    const estimate = QUICK_ESTIMATES.find((e) => e.id === estimateId)
    if (!estimate) return

    const newSelections = new Map<string, number>()

    // Populate based on estimate
    if (estimateId === "small_office") {
      newSelections.set("desk_standard", 8)
      newSelections.set("chair_office", 8)
      newSelections.set("cabinet_filing_2", 4)
      newSelections.set("computer_desktop", 8)
      newSelections.set("printer_small", 1)
      newSelections.set("table_meeting_4", 1)
      newSelections.set("chair_conference", 4)
    } else if (estimateId === "medium_office") {
      newSelections.set("desk_standard", 20)
      newSelections.set("desk_executive", 5)
      newSelections.set("chair_office", 25)
      newSelections.set("chair_executive", 5)
      newSelections.set("cabinet_filing_2", 15)
      newSelections.set("cabinet_filing_4", 5)
      newSelections.set("computer_desktop", 25)
      newSelections.set("printer_mfp", 2)
      newSelections.set("table_meeting_8", 1)
      newSelections.set("table_meeting_4", 2)
      newSelections.set("chair_conference", 16)
      newSelections.set("whiteboard", 3)
      newSelections.set("bookshelf", 4)
      newSelections.set("kitchen_fridge", 1)
    } else if (estimateId === "large_office") {
      newSelections.set("desk_standard", 40)
      newSelections.set("desk_executive", 10)
      newSelections.set("workstation_pod", 5)
      newSelections.set("reception_desk", 1)
      newSelections.set("chair_office", 60)
      newSelections.set("chair_executive", 10)
      newSelections.set("chair_visitor", 10)
      newSelections.set("cabinet_filing_2", 30)
      newSelections.set("cabinet_filing_4", 10)
      newSelections.set("cabinet_storage", 5)
      newSelections.set("locker_bank", 3)
      newSelections.set("computer_desktop", 50)
      newSelections.set("monitor", 20)
      newSelections.set("printer_mfp", 4)
      newSelections.set("server_rack", 1)
      newSelections.set("network_cabinet", 2)
      newSelections.set("table_meeting_12", 1)
      newSelections.set("table_meeting_8", 2)
      newSelections.set("table_meeting_4", 4)
      newSelections.set("chair_conference", 40)
      newSelections.set("whiteboard", 6)
      newSelections.set("tv_display", 5)
      newSelections.set("video_conf", 2)
      newSelections.set("bookshelf", 8)
      newSelections.set("sofa_3seat", 2)
      newSelections.set("kitchen_fridge", 2)
      newSelections.set("kitchen_appliances", 2)
    }

    setSelections(newSelections)
    setShowQuickEstimate(false)
  }, [])

  // Toggle category expansion
  const toggleCategory = useCallback((category: string) => {
    setExpandedCategories((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(category)) {
        newSet.delete(category)
      } else {
        newSet.add(category)
      }
      return newSet
    })
  }, [])

  // Filter items by search
  const filteredCatalog = useMemo(() => {
    if (!searchQuery.trim()) return ITEM_CATALOG

    const query = searchQuery.toLowerCase()
    const filtered: Record<string, InventoryItem[]> = {}

    Object.entries(ITEM_CATALOG).forEach(([category, items]) => {
      const matchingItems = items.filter(
        (item) => item.name.toLowerCase().includes(query) || item.description?.toLowerCase().includes(query),
      )
      if (matchingItems.length > 0) {
        filtered[category] = matchingItems
      }
    })

    return filtered
  }, [searchQuery])

  // Handle completion
  const handleComplete = useCallback(() => {
    const selectionArray: InventorySelection[] = []
    selections.forEach((quantity, itemId) => {
      if (quantity > 0) {
        selectionArray.push({ itemId, quantity })
      }
    })
    onSelectionComplete(selectionArray, totals.estimatedSqm)
  }, [selections, totals.estimatedSqm, onSelectionComplete])

  return (
    <Card className={cn("w-full", embedded ? "border-0 shadow-none" : "")}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold">What are you moving?</CardTitle>
          {totals.totalItems > 0 && (
            <Badge variant="secondary" className="text-sm">
              {totals.totalItems} items | ~{totals.estimatedSqm} sqm
            </Badge>
          )}
        </div>
        <p className="text-sm text-muted-foreground">
          Select items to get an accurate quote, or use a quick estimate below.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Quick Estimates */}
        {showQuickEstimate && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Sparkles className="h-4 w-4 text-primary" />
              Quick Estimates
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              {QUICK_ESTIMATES.map((estimate) => (
                <Button
                  key={estimate.id}
                  variant="outline"
                  className="h-auto flex-col items-start p-3 text-left bg-transparent"
                  onClick={() => applyQuickEstimate(estimate.id)}
                >
                  <span className="font-medium">{estimate.label}</span>
                  <span className="text-xs text-muted-foreground">{estimate.description}</span>
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* Search */}
        <div className="relative">
          <Input
            placeholder="Search items..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full"
          />
        </div>

        {/* Category tabs for larger screens */}
        <Tabs value={activeCategory} onValueChange={setActiveCategory} className="hidden md:block">
          <TabsList className="grid w-full grid-cols-6">
            {Object.entries(CATEGORY_INFO).map(([key, info]) => (
              <TabsTrigger key={key} value={key} className="flex items-center gap-1 text-xs">
                {info.icon}
                <span className="hidden lg:inline">{info.label}</span>
                {totals.categoryCounts[key] && (
                  <Badge variant="secondary" className="ml-1 h-5 px-1 text-xs">
                    {totals.categoryCounts[key]}
                  </Badge>
                )}
              </TabsTrigger>
            ))}
          </TabsList>

          {Object.entries(filteredCatalog).map(([category, items]) => (
            <TabsContent key={category} value={category} className="mt-4">
              <ScrollArea className="h-[300px] pr-4">
                <div className="grid gap-2">
                  {items.map((item) => (
                    <ItemRow
                      key={item.id}
                      item={item}
                      quantity={selections.get(item.id) || 0}
                      onUpdateQuantity={(delta) => updateQuantity(item.id, delta)}
                      onSetQuantity={(value) => setQuantity(item.id, value)}
                    />
                  ))}
                </div>
              </ScrollArea>
            </TabsContent>
          ))}
        </Tabs>

        {/* Accordion for mobile */}
        <div className="space-y-2 md:hidden">
          {Object.entries(filteredCatalog).map(([category, items]) => {
            const info = CATEGORY_INFO[category]
            const isExpanded = expandedCategories.has(category)
            const categoryCount = totals.categoryCounts[category] || 0

            return (
              <div key={category} className="rounded-lg border">
                <button
                  className="flex w-full items-center justify-between p-3"
                  onClick={() => toggleCategory(category)}
                >
                  <div className="flex items-center gap-2">
                    <div className={cn("rounded p-1 text-white", info.color)}>{info.icon}</div>
                    <span className="font-medium">{info.label}</span>
                    {categoryCount > 0 && (
                      <Badge variant="secondary" className="text-xs">
                        {categoryCount}
                      </Badge>
                    )}
                  </div>
                  {isExpanded ? (
                    <ChevronUp className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  )}
                </button>
                {isExpanded && (
                  <div className="border-t px-3 pb-3">
                    <div className="grid gap-2 pt-2">
                      {items.map((item) => (
                        <ItemRow
                          key={item.id}
                          item={item}
                          quantity={selections.get(item.id) || 0}
                          onUpdateQuantity={(delta) => updateQuantity(item.id, delta)}
                          onSetQuantity={(value) => setQuantity(item.id, value)}
                          compact
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Summary and Actions */}
        <div className="flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm">
            {totals.totalItems > 0 ? (
              <div className="space-y-1">
                <div className="font-medium">{totals.totalItems} items selected</div>
                <div className="text-muted-foreground">Estimated space: ~{totals.estimatedSqm} square metres</div>
              </div>
            ) : (
              <div className="text-muted-foreground">Select items or use a quick estimate above</div>
            )}
          </div>
          <div className="flex gap-2">
            {onCancel && (
              <Button variant="outline" onClick={onCancel}>
                Cancel
              </Button>
            )}
            <Button onClick={handleComplete} disabled={totals.totalItems === 0} className="gap-2">
              <Check className="h-4 w-4" />
              Continue with {totals.estimatedSqm} sqm
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// Item row component
interface ItemRowProps {
  item: InventoryItem
  quantity: number
  onUpdateQuantity: (delta: number) => void
  onSetQuantity: (value: number) => void
  compact?: boolean
}

function ItemRow({ item, quantity, onUpdateQuantity, onSetQuantity, compact = false }: ItemRowProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [inputValue, setInputValue] = useState(quantity.toString())

  const handleInputBlur = () => {
    const value = Number.parseInt(inputValue) || 0
    onSetQuantity(value)
    setIsEditing(false)
  }

  const handleInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleInputBlur()
    }
  }

  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-lg border p-2 transition-colors",
        quantity > 0 ? "border-primary/50 bg-primary/5" : "border-border hover:bg-muted/50",
        compact && "p-2",
      )}
    >
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">{item.icon}</span>
          <span className={cn("font-medium", compact && "text-sm")}>{item.name}</span>
        </div>
        {!compact && item.description && <p className="mt-0.5 text-xs text-muted-foreground">{item.description}</p>}
      </div>
      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8 bg-transparent"
          onClick={() => onUpdateQuantity(-1)}
          disabled={quantity === 0}
        >
          <Minus className="h-3 w-3" />
        </Button>
        {isEditing ? (
          <Input
            type="number"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onBlur={handleInputBlur}
            onKeyDown={handleInputKeyDown}
            className="h-8 w-14 text-center"
            autoFocus
            min={0}
          />
        ) : (
          <button
            onClick={() => {
              setInputValue(quantity.toString())
              setIsEditing(true)
            }}
            className={cn(
              "flex h-8 w-14 items-center justify-center rounded-md border text-sm font-medium",
              quantity > 0 ? "border-primary bg-primary/10 text-primary" : "border-border",
            )}
          >
            {quantity}
          </button>
        )}
        <Button variant="outline" size="icon" className="h-8 w-8 bg-transparent" onClick={() => onUpdateQuantity(1)}>
          <Plus className="h-3 w-3" />
        </Button>
      </div>
    </div>
  )
}
