const moveTypes = {
    office_relocation: {
        name: "Office Relocation",
        baseRate: 2500,
        perSqm: 45,
        minSqm: 20,
        description: "Complete office moves including workstations, furniture, and equipment.",
        icon: "building",
        qualifyingQuestions: [
            "How many workstations or desks need to be moved?",
            "Do you have any server rooms or IT infrastructure?",
            "Are there any large items like boardroom tables or reception desks?",
        ],
    },
    it_equipment_moved: {
        name: "IT Equipment Transport",
        baseRate: 1500,
        perSqm: 35,
        minSqm: 10,
        description: "Safe transport of computers, servers, and networking equipment.",
        icon: "computer",
        qualifyingQuestions: [
            "Approximately how many computers and monitors are being moved?",
            "Are there any servers or network switches included?",
            "Do you need packing materials for fragile equipment?",
        ],
    },
    office_furniture_moved: {
        name: "Office Furniture Move",
        baseRate: 2000,
        perSqm: 40,
        minSqm: 30,
        description: "Relocating existing desks, chairs, and storage units.",
        icon: "building",
        qualifyingQuestions: [
            "How many desks and chairs?",
            "Any disassembly required?",
            "Do you have filing cabinets or compactus units?",
        ],
    },
    datacentre_relocation: {
        name: "Data Centre Migration",
        baseRate: 5000,
        perSqm: 85,
        minSqm: 50,
        description: "Specialised data centre relocations with anti-static handling.",
        icon: "server",
        qualifyingQuestions: [
            "How many server racks need to be relocated?",
            "Is there a maximum downtime window we need to work within?",
            "Do you need us to coordinate with your IT team for reconnection?",
        ],
    },
    office_furniture_installation: {
        name: "Furniture Installation",
        baseRate: 1000,
        perSqm: 25,
        minSqm: 10,
        description: "Assembly and installation of new office furniture.",
        icon: "building",
        qualifyingQuestions: [
            "What brand/system of furniture is being installed?",
            "Do you have the floor plans ready?",
            "Is the delivery coordinate with the installation?",
        ],
    },
    it_equipment_installation: {
        name: "IT Equipment Connect",
        baseRate: 1200,
        perSqm: 30,
        minSqm: 10,
        description: "Setup, cabling, and testing of IT hardware.",
        icon: "computer",
        qualifyingQuestions: [
            "How many workstations need cable management?",
            "Do you need server patching?",
            "Is the network infrastructure ready?",
        ],
    },
    it_asset_management: {
        name: "IT Asset Management",
        baseRate: 800,
        perSqm: 15,
        minSqm: 10,
        description: "Inventory, storage, and lifecycle management.",
        icon: "warehouse",
        qualifyingQuestions: [
            "Do you need secure storage?",
            "Is this for disposal or deployment?",
            "Do you need asset tagging?",
        ],
    },
    general: {
        name: "General / Other",
        baseRate: 2000,
        perSqm: 40,
        minSqm: 20,
        description: "Custom moving services.",
        icon: "store",
        qualifyingQuestions: [
            "Describe what you need moved.",
            "Are there any special handling requirements?",
            "What is the timeline?",
        ],
    },
};

console.log("Verifying Move Categories...");
const categories = Object.keys(moveTypes);
console.log(`Found ${categories.length} categories.`);

let errors = 0;
categories.forEach(cat => {
    const c = moveTypes[cat as keyof typeof moveTypes];
    if (!c.name) { console.error(`Missing name for ${cat}`); errors++; }
    if (typeof c.baseRate !== 'number') { console.error(`Invalid baseRate for ${cat}`); errors++; }
    if (typeof c.perSqm !== 'number') { console.error(`Invalid perSqm for ${cat}`); errors++; }
    if (!c.qualifyingQuestions || c.qualifyingQuestions.length === 0) { console.error(`Missing qualifyingQuestions for ${cat}`); errors++; }
});

if (errors === 0) {
    console.log("All categories verified successfully!");
} else {
    console.error(`Found ${errors} errors.`);
    process.exit(1);
}
