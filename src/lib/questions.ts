export interface QuestionItem {
  question_number: number;
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_option: string;
  explanation: string;
}

export const INITIAL_QUESTIONS: QuestionItem[] = [
  {
    question_number: 1,
    question_text: "What is the maximum body weight that green mud crabs typically reach?",
    option_a: "500 grams",
    option_b: "1 kilogram",
    option_c: "Around 2 kilograms",
    option_d: "3 to 4 kilograms",
    correct_option: "C",
    explanation: "Green mud crabs (Scylla serrata) typically reach a maximum body weight of around 2 kilograms under standard conditions."
  },
  {
    question_number: 2,
    question_text: "Which genus do mud crabs belong to?",
    option_a: "Penaeus",
    option_b: "Scylla",
    option_c: "Portunus",
    option_d: "Callinectes",
    correct_option: "B",
    explanation: "Mud crabs belong to the genus Scylla under the family Portunidae."
  },
  {
    question_number: 3,
    question_text: "Mud crabs naturally inhabit which type of environment?",
    option_a: "Freshwater lakes",
    option_b: "Deep ocean trenches",
    option_c: "Estuaries and backwater/mangrove regions",
    option_d: "Mountain streams",
    correct_option: "C",
    explanation: "Mud crabs are coastal invertebrates inhabiting brackish estuaries, mangrove swamps, and sheltered tidal backwaters."
  },
  {
    question_number: 4,
    question_text: "What primary morphological feature helps distinguish Scylla serrata from Scylla olivacea on the outer margin of the wrist (carpus)?",
    option_a: "S. serrata has no spines",
    option_b: "S. serrata has more than one prominent, sharp spine",
    option_c: "S. olivacea has three sharp spines",
    option_d: "S. serrata has a completely smooth carpus",
    correct_option: "B",
    explanation: "Scylla serrata possesses more than one prominent, sharp spine on the carpus outer margin, distinguishing it from S. olivacea which has a single blunt or reduced spine."
  },
  {
    question_number: 5,
    question_text: "What is the typical weight range for the orange mud crab (Scylla olivacea)?",
    option_a: "50–100 g",
    option_b: "200–800 g",
    option_c: "1–2 kg",
    option_d: "3–4 kg",
    correct_option: "B",
    explanation: "The orange mud crab (Scylla olivacea) is smaller than S. serrata and typically ranges between 200–800 grams."
  },
  {
    question_number: 6,
    question_text: "How can a male mud crab be distinguished from a female by observing the ventral side?",
    option_a: "Males have an oval-shaped abdomen",
    option_b: "Males have a conical/inverted 'T' shaped abdomen",
    option_c: "Females have no abdominal flap",
    option_d: "Males carry egg masses on their abdomen",
    correct_option: "B",
    explanation: "Male mud crabs possess a narrow, conical or inverted 'T'-shaped abdominal flap, whereas mature females have a broad, semicircular/oval abdomen for carrying eggs."
  },
  {
    question_number: 7,
    question_text: "How many pairs of pleopods are present under the abdominal flap of a male mud crab?",
    option_a: "1 pair",
    option_b: "2 pairs",
    option_c: "4 pairs",
    option_d: "5 pairs",
    correct_option: "B",
    explanation: "Male mud crabs have 2 pairs of pleopods (gonopods) modified for copulation, compared to 4 pairs in females used for holding eggs."
  },
  {
    question_number: 8,
    question_text: "What is the key difference between Scylla olivacea and Scylla serrata?",
    option_a: "S. olivacea is larger and has more than one sharp spine on the carpus",
    option_b: "S. serrata has smooth claws while S. olivacea has rough claws",
    option_c: "S. serrata is larger, has sharp multiple spines on the carpus; S. olivacea is smaller with a single blunt spine",
    option_d: "Both species are identical in appearance",
    correct_option: "C",
    explanation: "S. serrata grows larger and features sharp multiple spines on the carpus; S. olivacea is smaller and has a single blunt spine."
  },
  {
    question_number: 9,
    question_text: "What is the most common overall fattening cycle duration for mud crabs?",
    option_a: "1 to 5 days",
    option_b: "10 to 12 days",
    option_c: "25 to 60 days",
    option_d: "120 to 180 days",
    correct_option: "C",
    explanation: "The overall mud crab fattening process typically takes between 25 to 60 days depending on initial fullness and feed conversion."
  },
  {
    question_number: 10,
    question_text: "What is the expected fattening duration for semi-filled (Grade B or C) crabs?",
    option_a: "10 to 20 days",
    option_b: "40 to 60 days",
    option_c: "70 to 90 days",
    option_d: "100 days",
    correct_option: "A",
    explanation: "Semi-filled (Grade B or C) water crabs with firm shells can be fully fattened in 10 to 20 days of intensive nutrition."
  },
  {
    question_number: 11,
    question_text: "What is 'fattening' in mud crab aquaculture?",
    option_a: "Breeding male crabs to produce larvae",
    option_b: "Converting water crabs or soft-shelled crabs into hard-shelled crabs",
    option_c: "Freezing crabs for long-term export",
    option_d: "Removing claws to reduce aggression",
    correct_option: "B",
    explanation: "Fattening is the holding and intensive feeding of post-molt 'water crabs' or soft-shelled crabs until their meat and hepatopancreas become fully packed."
  },
  {
    question_number: 12,
    question_text: "Why is over-keeping crabs in a system after they become fully filled harmful?",
    option_a: "They moult immediately into larvae",
    option_b: "It results in weight loss and increased mortality risk",
    option_c: "The shell turns transparent",
    option_d: "The water salinity drops to zero",
    correct_option: "B",
    explanation: "Keeping crabs beyond peak fullness leads to energetic depletion, weight loss, shell fouling, and increased risk of mortality or cannibalism."
  },
  {
    question_number: 13,
    question_text: "During copulation, a hard-shelled male mates with a female in which condition?",
    option_a: "Hard-shelled",
    option_b: "Berried",
    option_c: "Freshly moulted (soft-shelled)",
    option_d: "Dead",
    correct_option: "C",
    explanation: "Mating in mud crabs can only occur when the female has freshly moulted and is still soft-shelled, paired with a hard-shelled male."
  },
  {
    question_number: 14,
    question_text: "How long does the actual male-female holding/coupling during mating process typically last?",
    option_a: "5 to 10 minutes",
    option_b: "2 to 3 days overall (with spermatophore transfer taking ~5–10 hours)",
    option_c: "2 weeks",
    option_d: "1 month",
    correct_option: "B",
    explanation: "Pre- and post-copulatory clasping lasts 2 to 3 days overall, with actual spermatophore transfer taking approximately 5 to 10 hours."
  },
  {
    question_number: 15,
    question_text: "Peak breeding seasons for mud crabs typically occur in which months?",
    option_a: "December–January",
    option_b: "March–April and August–September",
    option_c: "June–July only",
    option_d: "November–December",
    correct_option: "B",
    explanation: "Peak breeding activity in tropical estuaries typically occurs in two pulses: March–April and August–September."
  },
  {
    question_number: 16,
    question_text: "What is a 'berried crab'?",
    option_a: "A crab fed on berries",
    option_b: "A spawned female carrying an egg mass",
    option_c: "A diseased crab with spots",
    option_d: "A crab that has lost both claws",
    correct_option: "B",
    explanation: "A 'berried crab' refers to an ovigerous female crab carrying a fertilized egg sponge attached to her abdominal pleopods."
  },
  {
    question_number: 17,
    question_text: "What color progression indicates that a berried crab's eggs are about to hatch within a day?",
    option_a: "Bright red to white",
    option_b: "Orange-red to deep yellow to dark grey",
    option_c: "Green to yellow",
    option_d: "Black to bright pink",
    correct_option: "B",
    explanation: "Crab eggs progress from orange-red/yellow when freshly extruded to deep yellow and finally dark grey/black as larval eyes and pigments develop right before hatching."
  },
  {
    question_number: 18,
    question_text: "Approximately how many eggs can a single female mud crab produce?",
    option_a: "100 to 500",
    option_b: "1,000 to 5,000",
    option_c: "10,000 to 50,000",
    option_d: "1 to 2 million",
    correct_option: "D",
    explanation: "A single large female mud crab produces high fecundity of approximately 1 to 2 million eggs in a single spawning sponge."
  },
  {
    question_number: 19,
    question_text: "What culture system is most suitable for mud crab farming in midland or non-coastal regions?",
    option_a: "Open ocean net pens",
    option_b: "Floating mangrove cages",
    option_c: "Bucket farming / Recirculatory Aquaculture Systems (RAS)",
    option_d: "Coastal tidal ponds",
    correct_option: "C",
    explanation: "Bucket farming / Recirculating Aquaculture Systems (RAS) with synthetic or trucked brine is ideal for inland/non-coastal crab production."
  },
  {
    question_number: 20,
    question_text: "What is the approximate crude protein content in the edible meat of mud crabs?",
    option_a: "2% to 5%",
    option_b: "13% to 17%",
    option_c: "35% to 40%",
    option_d: "50% to 60%",
    correct_option: "B",
    explanation: "Mud crab meat contains approximately 13% to 17% high-biological-value crude protein on a wet-weight basis."
  },
  {
    question_number: 21,
    question_text: "Which gender of mud crab generally exhibits higher protein content in its meat?",
    option_a: "Male",
    option_b: "Female",
    option_c: "Both are identical",
    option_d: "Neither contains protein",
    correct_option: "B",
    explanation: "Female mud crabs, especially with developing ovaries (coral), generally exhibit higher overall protein and nutrient density."
  },
  {
    question_number: 22,
    question_text: "How often do juvenile mud crabs typically moult under optimal conditions?",
    option_a: "Every 24 hours",
    option_b: "Every 7 to 20 days",
    option_c: "Every 60 to 90 days",
    option_d: "Once a year",
    correct_option: "B",
    explanation: "Under warm tropical conditions with abundant food, juvenile crablets moult every 7 to 20 days to support rapid growth."
  },
  {
    question_number: 23,
    question_text: "What happens to the frequency of moulting as a mud crab reaches full maturity?",
    option_a: "It speeds up drastically",
    option_b: "It stays every 3 days",
    option_c: "It slows down significantly or stops",
    option_d: "They moult twice a day",
    correct_option: "C",
    explanation: "As crabs reach terminal maturity and large body size, the intermoult period lengthens significantly or moulting stops altogether."
  },
  {
    question_number: 24,
    question_text: "What ideal pH range should be maintained for mud crab fattening?",
    option_a: "5.0 – 6.0",
    option_b: "6.5 – 7.0",
    option_c: "7.8 – 8.4",
    option_d: "9.5 – 10.5",
    correct_option: "C",
    explanation: "The optimal water pH for mud crab health, calcification, and biofilter nitrification is mildly alkaline: 7.8 – 8.4."
  },
  {
    question_number: 25,
    question_text: "What will you do if the pH increases beyond the ideal range in the crab system?",
    option_a: "Add Sodium Bicarbonate",
    option_b: "Add Vinegar to lower the pH",
    option_c: "Add more salt",
    option_d: "Do a full water change immediately",
    correct_option: "B",
    explanation: "Diluted food-grade acetic acid (vinegar) can be safely added in calculated doses to neutralize high alkalinity and bring pH down."
  },
  {
    question_number: 26,
    question_text: "How many drops of the pH kit reagent are added into the test tube when testing water pH?",
    option_a: "2 drops",
    option_b: "3 drops",
    option_c: "5 drops",
    option_d: "10 drops",
    correct_option: "C",
    explanation: "Standard aquaculture colorimetric pH liquid testing kits require adding 5 drops of indicator reagent into the sample tube."
  },
  {
    question_number: 27,
    question_text: "How many drops of the ammonia kit reagent are added when testing water for ammonia levels?",
    option_a: "3 drops",
    option_b: "5 drops",
    option_c: "6 drops",
    option_d: "8 drops",
    correct_option: "D",
    explanation: "Standard multi-reagent ammonia liquid testing kits specify 8 drops of reagent solution for color development."
  },
  {
    question_number: 28,
    question_text: "What are the water quality tests that must be done every day in a mud crab fattening system?",
    option_a: "Temperature and colour only",
    option_b: "Salinity, pH and Ammonia",
    option_c: "Nitrite and nitrate only",
    option_d: "Dissolved oxygen and turbidity only",
    correct_option: "B",
    explanation: "Salinity, pH, and toxic total Ammonia are the critical daily water parameters required to prevent mortality."
  },
  {
    question_number: 29,
    question_text: "What are the four filters used in the RAS filtration system and their correct order?",
    option_a: "Sand filter → Skimmer with ceramics → Skimmer with filtration stones → Mechanical sponge filter",
    option_b: "Mechanical sponge filter → Skimmer with ceramics → Skimmer with filtration stones → Sand filter",
    option_c: "Skimmer with ceramics → Sand filter → Mechanical sponge filter → Skimmer with filtration stones",
    option_d: "Sand filter → Mechanical sponge filter → Skimmer with filtration stones → Skimmer with ceramics",
    correct_option: "B",
    explanation: "The proper treatment chain flows from gross mechanical sponge filtration, through protein skimming with ceramics, filtration stones, and sand polishing."
  },
  {
    question_number: 30,
    question_text: "Why is sand kept inside the crab boxes in the RAS system?",
    option_a: "To increase water salinity naturally",
    option_b: "To make the crab feel comfortable, prevent dipping and help in the fattening process",
    option_c: "To filter waste water inside the box",
    option_d: "To keep the box heavy and stable",
    correct_option: "B",
    explanation: "Providing bottom sand substrate satisfies natural burrowing instincts, lowers stress and energy expenditure, and promotes rapid meat deposition."
  },
  {
    question_number: 31,
    question_text: "What type of crab boxes should be used in a RAS crab fattening system?",
    option_a: "Clear transparent boxes so crabs can be seen easily",
    option_b: "Open top mesh boxes for better water flow",
    option_c: "Dark boxes through which light does not pass",
    option_d: "White plastic boxes with holes on all sides",
    correct_option: "C",
    explanation: "Crabs are nocturnal and photophobic; dark light-blocking individual boxes eliminate visual stress, claw-waving, and energy loss."
  },
  {
    question_number: 32,
    question_text: "What is the recommended water salinity range for mud crab fattening?",
    option_a: "0 – 2 ppt",
    option_b: "15 – 30 ppt",
    option_c: "45 – 60 ppt",
    option_d: "80 – 100 ppt",
    correct_option: "B",
    explanation: "15 to 30 ppt provides the optimal isosmotic environment for Scylla species, minimizing osmoregulatory stress and maximizing feed efficiency."
  },
  {
    question_number: 33,
    question_text: "What is the minimum target Dissolved Oxygen (DO) level for crab fattening water?",
    option_a: "> 1 mg/L",
    option_b: "> 2 mg/L",
    option_c: "> 5 mg/L (or ~6 ppm)",
    option_d: "> 15 mg/L",
    correct_option: "C",
    explanation: "Dissolved oxygen should be maintained above 5 mg/L (~6 ppm) to support active crab metabolism and aerobic nitrifying biofilter bacteria."
  },
  {
    question_number: 34,
    question_text: "In the nitrogen cycle, which toxic compound is produced directly from crab waste and unconsumed feed?",
    option_a: "Nitrate (NO3-)",
    option_b: "Ammonia (NH3 / NH4+)",
    option_c: "Calcium carbonate",
    option_d: "Sulfate",
    correct_option: "B",
    explanation: "Decomposition of uneaten proteinaceous feed and crab gill excretion directly releases toxic un-ionized Ammonia."
  },
  {
    question_number: 35,
    question_text: "Which specialized bacteria convert toxic Ammonia (NH3) into Nitrite (NO2-)?",
    option_a: "Nitrobacter",
    option_b: "Nitrosomonas",
    option_c: "E. coli",
    option_d: "Bacillus subtilis",
    correct_option: "B",
    explanation: "Nitrosomonas bacteria are ammonia-oxidizing autotrophs that convert NH3 into nitrite (NO2-)."
  },
  {
    question_number: 36,
    question_text: "Which bacteria convert Nitrite (NO2-) into the much less toxic Nitrate (NO3-)?",
    option_a: "Nitrosomonas",
    option_b: "Nitrobacter",
    option_c: "Rhizobium",
    option_d: "Vibrio",
    correct_option: "B",
    explanation: "Nitrobacter are nitrite-oxidizing bacteria that complete the nitrification cycle by converting toxic nitrite into benign nitrate (NO3-)."
  },
  {
    question_number: 37,
    question_text: "What chemical compound can be added to raise water pH and alkalinity in aquaculture systems?",
    option_a: "Sodium Bicarbonate (NaHCO3)",
    option_b: "Formalin",
    option_c: "Copper Sulfate",
    option_d: "Potassium Permanganate",
    correct_option: "A",
    explanation: "Sodium Bicarbonate (NaHCO3) is safe, dissolves rapidly, and buffers water alkalinity while gently raising pH."
  },
  {
    question_number: 38,
    question_text: "How much sodium bicarbonate (NaHCO3) is added per 1000 liters of water to increase pH by 0.2 units?",
    option_a: "10 grams",
    option_b: "50 grams",
    option_c: "100 grams",
    option_d: "500 grams",
    correct_option: "C",
    explanation: "Approximately 100 grams of NaHCO3 per 1000 liters is standard for raising system pH by roughly 0.2 units."
  },
  {
    question_number: 39,
    question_text: "What dosage of bleaching powder (65% active chlorine) is used for water disinfection per 1000 liters?",
    option_a: "10 grams",
    option_b: "100 grams",
    option_c: "500 grams",
    option_d: "1 kilogram",
    correct_option: "B",
    explanation: "100 grams of 65% active bleaching powder per 1000 liters provides an effective disinfection dose of ~65 ppm available chlorine."
  },
  {
    question_number: 40,
    question_text: "What is the recommended resting time for water after chlorination treatment before use?",
    option_a: "5 minutes",
    option_b: "1 hour",
    option_c: "12 to 24 hours",
    option_d: "5 days",
    correct_option: "C",
    explanation: "Treated water must be vigorously aerated and allowed to rest for 12 to 24 hours to ensure all residual chlorine has fully dissipated."
  },
  {
    question_number: 41,
    question_text: "For crab quarantine bath treatments, what is the standard concentration of Potassium Permanganate (KMnO4)?",
    option_a: "2 ppm (2 mg/L)",
    option_b: "20 ppm",
    option_c: "100 ppm",
    option_d: "1 ppm",
    correct_option: "A",
    explanation: "A mild bath of 2 ppm (2 mg/L) Potassium Permanganate treats external parasites and bacterial fouling without injuring crab gills."
  },
  {
    question_number: 42,
    question_text: "What concentration of Formalin is recommended for crab quarantine dipping?",
    option_a: "0.1 ppm",
    option_b: "10 ppm",
    option_c: "50 ppm",
    option_d: "100 ppm",
    correct_option: "A",
    explanation: "According to the Crab Shack curriculum guidelines, 0.1 ppm is the designated quarantine dipping concentration."
  },
  {
    question_number: 43,
    question_text: "What is recommended for crab quarantine holding?",
    option_a: "Holding tank",
    option_b: "RAS",
    option_c: "Bucket system",
    option_d: "Pond system and holding tank",
    correct_option: "A",
    explanation: "A dedicated separate holding tank isolated from the main recirculating system is essential during the quarantine acclimatization period."
  },
  {
    question_number: 44,
    question_text: "In a 1000-liter synthetic seawater mixture, how much Sodium Chloride (NaCl) is required?",
    option_a: "1 kg",
    option_b: "5 kg",
    option_c: "15 kg",
    option_d: "30 kg",
    correct_option: "C",
    explanation: "In synthetic seawater preparation for 15-20 ppt brackish aquaculture, 15 kg of pure non-iodized NaCl per 1000 L forms the base salt profile."
  },
  {
    question_number: 45,
    question_text: "In a 1000-liter synthetic seawater formula, how much Magnesium Sulfate (MgSO4) is added?",
    option_a: "150 g",
    option_b: "500 g",
    option_c: "1.5 kg",
    option_d: "5 kg",
    correct_option: "C",
    explanation: "1.5 kg of Magnesium Sulfate (Epsom salt) per 1000 liters provides essential magnesium ions necessary for crab ecdysis and shell hardening."
  },
  {
    question_number: 46,
    question_text: "What instrument is used to measure water salinity by measuring light refraction?",
    option_a: "pH meter",
    option_b: "Refractometer / Salinometer",
    option_c: "Secchi disk",
    option_d: "Hydrometer syringe",
    correct_option: "B",
    explanation: "An optical refractometer (or optical salinometer) measures the bending of light through a water drop to read salinity in parts per thousand (ppt)."
  },
  {
    question_number: 47,
    question_text: "What is the percentage of feed weight given to crab during the fattening process?",
    option_a: "5 to 10 grams",
    option_b: "10 to 50 grams",
    option_c: "20 to 30 grams",
    option_d: "100 to 200 grams",
    correct_option: "C",
    explanation: "Per Crab Shack training specifications, individual feeding portions are measured at 20 to 30 grams per feed distribution."
  },
  {
    question_number: 48,
    question_text: "Why is excess feeding with raw trash fish or offal discouraged in closed systems?",
    option_a: "Crabs become vegetarian",
    option_b: "It causes rapid water quality deterioration",
    option_c: "It softens the crab shell permanently",
    option_d: "It prevents water evaporation",
    correct_option: "B",
    explanation: "Excess uneaten raw fish spoils rapidly in warm water, creating massive spikes in ammonia, nitrite, and bacterial blooming."
  },
  {
    question_number: 49,
    question_text: "What does 'RAS' stand for in modern aquaculture?",
    option_a: "Rapid Aquatic System",
    option_b: "Recirculatory Aquaculture System",
    option_c: "Reservoir Auto-cleansing System",
    option_d: "Recycled Algae System",
    correct_option: "B",
    explanation: "RAS stands for Recirculatory (or Recirculating) Aquaculture System."
  },
  {
    question_number: 50,
    question_text: "What primary role does a Mechanical Filter perform in an RAS system?",
    option_a: "Converts ammonia to nitrate",
    option_b: "Kills bacteria using light",
    option_c: "Traps and removes solid particulate waste and debris",
    option_d: "Heats the water",
    correct_option: "C",
    explanation: "Mechanical filtration acts as the physical barrier that intercepts and eliminates feces, molt fragments, and uneaten feed particles before they break down."
  },
  {
    question_number: 51,
    question_text: "What does MBBR stand for in RAS filtration technology?",
    option_a: "Moving Bed Biofilm Reactor",
    option_b: "Mechanical Biological Basin Refiner",
    option_c: "Marine Bacterial Bio Recovery",
    option_d: "Micro Bubble Bio Reducer",
    correct_option: "A",
    explanation: "MBBR stands for Moving Bed Biofilm Reactor."
  },
  {
    question_number: 52,
    question_text: "How do plastic media carriers inside an MBBR unit support biofiltration?",
    option_a: "They absorb water like sponges",
    option_b: "They provide a high surface area for nitrifying bacterial biofilms to grow",
    option_c: "They release chlorine into the water",
    option_d: "They dissolve to increase salinity",
    correct_option: "B",
    explanation: "MBBR plastic carriers (K1/K3 media) feature engineered ridges and wheel shapes that offer enormous surface area for bacterial colonization."
  },
  {
    question_number: 53,
    question_text: "What machinery component is used in RAS to kill pathogens and floating microbes without chemicals?",
    option_a: "Protein skimmer",
    option_b: "UV Sterilizer / Ozone unit",
    option_c: "Submersible heater",
    option_d: "Mechanical sponge",
    correct_option: "B",
    explanation: "UV sterilizers emit ultraviolet radiation at 254 nm to destroy viral and bacterial DNA without adding harmful chemical residues."
  },
  {
    question_number: 54,
    question_text: "What parameter does a degassing column in an RAS setup primarily help remove from water?",
    option_a: "Dissolved Oxygen",
    option_b: "Carbon Dioxide (CO2)",
    option_c: "Calcium",
    option_d: "Sodium Chloride",
    correct_option: "B",
    explanation: "Degassing columns strip accumulated carbon dioxide (CO2) from crab and bacterial respiration into the atmosphere."
  },
  {
    question_number: 55,
    question_text: "For a 30-box individual crab RAS setup, what pump flow rate is typically recommended for water circulation?",
    option_a: "500 LPH",
    option_b: "1,000 LPH",
    option_c: "5,000 to 6,000 LPH",
    option_d: "50,000 LPH",
    correct_option: "C",
    explanation: "A circulation pump rated between 5,000 to 6,000 liters per hour (LPH) ensures steady turnover through all filtration stages and individual crab boxes."
  },
  {
    question_number: 56,
    question_text: "What is the function of an aeration air pump (Hi-Blow) in an RAS crab system?",
    option_a: "To cool down the water temperature",
    option_b: "To supply continuous dissolved oxygen and keep MBBR media moving",
    option_c: "To pump out solid waste",
    option_d: "To measure water pH levels",
    correct_option: "B",
    explanation: "High-output diaphragm aeration pumps deliver continuous dissolved oxygen and agitate the bio-media carriers to shed aging biofilm."
  },
  {
    question_number: 57,
    question_text: "Daily feed allowance for fattening mud crabs is calculated at what percentage of their body weight?",
    option_a: "1 – 2%",
    option_b: "5 – 8%",
    option_c: "15 – 20%",
    option_d: "30 – 40%",
    correct_option: "C",
    explanation: "In the Crab Shack model examination specifications, daily feed ration is calculated at 15 – 20% of crab body weight during intensive fattening."
  },
  {
    question_number: 58,
    question_text: "What feature on female pleopods helps attach and carry eggs during brooding?",
    option_a: "Sharp spines",
    option_b: "Suction cups",
    option_c: "Fine setae",
    option_d: "Calcified hooks",
    correct_option: "C",
    explanation: "Female pleopods possess dense non-pennate ovigerous setae that entangle and securely anchor the extruded eggs into a sponge."
  },
  {
    question_number: 59,
    question_text: "What is the larval stage sequence of a mud crab?",
    option_a: "Megalopa → Zoea → Juvenile",
    option_b: "Zoea → Megalopa → Juvenile",
    option_c: "Juvenile → Zoea → Adult",
    option_d: "Egg → Adult → Megalopa",
    correct_option: "B",
    explanation: "Mud crab larvae hatch as free-swimming Zoea (5 stages), metamorphose into the settling Megalopa stage, and finally molt into the first benthic Juvenile crablet."
  }
];
