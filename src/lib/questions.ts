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
    question_text: "Which commercial species of mud crab is known as the 'giant mud crab' or 'green mud crab' and commands the highest global market value?",
    option_a: "Scylla olivacea",
    option_b: "Scylla serrata",
    option_c: "Scylla paramamosain",
    option_d: "Scylla tranquebarica",
    correct_option: "B",
    explanation: "Scylla serrata (giant/green mud crab) grows to the largest size (often exceeding 1.5 - 2 kg) and commands the premium price in commercial aquaculture."
  },
  {
    question_number: 2,
    question_text: "What is the optimal water salinity range for grow-out culture and fattening of mud crabs?",
    option_a: "2 to 5 ppt",
    option_b: "15 to 25 ppt",
    option_c: "35 to 45 ppt",
    option_d: "0 to 1 ppt",
    correct_option: "B",
    explanation: "Mud crabs are euryhaline, but optimal growth, osmotic balance, and molting occur between 15 and 25 ppt."
  },
  {
    question_number: 3,
    question_text: "In mud crab aquaculture, what is the primary objective of 'crab fattening'?",
    option_a: "Hatching eggs from captive broodstock",
    option_b: "Rapidly conditioning post-molt 'water crabs' (lean crabs) until muscle and hepatopancreas are dense and full",
    option_c: "Rearing crablets from 1g to 50g in nurseries",
    option_d: "Extracting pharmaceutical-grade chitin from shed carapaces",
    correct_option: "B",
    explanation: "Fattening is a short-cycle holding process that transforms newly-molted 'water crabs' (empty shells) into hard-meated, top-grade marketable crabs."
  },
  {
    question_number: 4,
    question_text: "How long does a typical mud crab fattening cycle take in aquaculture ponds, pens, or boxes?",
    option_a: "6 to 9 months",
    option_b: "20 to 30 days",
    option_c: "1 to 3 days",
    option_d: "12 to 15 months",
    correct_option: "B",
    explanation: "Because fattening only adds muscle and gonadal mass without waiting for subsequent molts, it takes only 20 to 30 days."
  },
  {
    question_number: 5,
    question_text: "What is the most effective management intervention to minimize cannibalism during mud crab pond culture?",
    option_a: "Continuous 24-hour bright floodlights over the pond",
    option_b: "Deploying artificial shelters (PVC pipes, clay tiles, bamboo cages) on the pond floor",
    option_c: "Starving the crabs for three days between feedings",
    option_d: "Tripling stocking density to restrict territory",
    correct_option: "B",
    explanation: "Shelters provide vital hiding spaces for newly molted, soft crabs when they are vulnerable to attack from hard-shelled peers."
  },
  {
    question_number: 6,
    question_text: "What is the ideal water pH range recommended for healthy mud crab farming ponds?",
    option_a: "4.0 - 5.5",
    option_b: "6.0 - 6.5",
    option_c: "7.5 - 8.5",
    option_d: "9.5 - 11.0",
    correct_option: "C",
    explanation: "Slightly alkaline water (pH 7.5 to 8.5) supports proper exoskeleton calcification and avoids acid sulfate soil toxicity."
  },
  {
    question_number: 7,
    question_text: "What is the minimum dissolved oxygen (DO) concentration that should be maintained in mud crab ponds?",
    option_a: "Above 4.0 mg/L (ppm)",
    option_b: "Below 1.5 mg/L (ppm)",
    option_c: "Exactly 0.5 mg/L (ppm)",
    option_d: "18.0 to 22.0 mg/L (ppm)",
    correct_option: "A",
    explanation: "Dissolved oxygen above 4.0 mg/L ensures optimal respiration, feed intake, and disease resistance."
  },
  {
    question_number: 8,
    question_text: "What is the standard recommended daily feeding rate for mud crabs during the fattening phase?",
    option_a: "0.5% - 1% of total body weight",
    option_b: "5% - 10% of total body weight",
    option_c: "25% - 30% of total body weight",
    option_d: "45% - 50% of total body weight",
    correct_option: "B",
    explanation: "Crabs in fattening are fed 5% to 10% of their total biomass daily, split into morning and evening rations."
  },
  {
    question_number: 9,
    question_text: "Which feed type is most widely used and biologically suited for commercial mud crab fattening?",
    option_a: "Floating grass carp herbivorous pellets",
    option_b: "Fresh or chilled trash fish, molluscs (snails/clams), and slaughterhouse byproducts",
    option_c: "Dry wheat bran and crushed corn kernels",
    option_d: "Hydrated brewer's yeast extract",
    correct_option: "B",
    explanation: "Mud crabs are carnivorous scavengers requiring high-protein marine or brackish fresh wet feeds like trash fish, bivalves, and crabs."
  },
  {
    question_number: 10,
    question_text: "Why do modern commercial farms utilize vertical Crab House (box-cell) recirculation systems?",
    option_a: "To stimulate continuous communal mating",
    option_b: "To eliminate cannibalism, monitor individual feeding, and inspect soft-shell molting in real time",
    option_c: "To prevent crabs from ever touching water",
    option_d: "To force autotomy (claw shedding)",
    correct_option: "B",
    explanation: "Individual boxes provide 100% protection against peer cannibalism and allow precise feed dosing and immediate harvest upon molting."
  },
  {
    question_number: 11,
    question_text: "What does the term 'berried female' signify in mud crab hatchery terminology?",
    option_a: "A female crab conditioned exclusively on aquatic berries",
    option_b: "A gravid female carrying an extruded sponge/egg mass attached to abdominal pleopods",
    option_c: "A juvenile female lacking secondary sexual appendages",
    option_d: "A crab infested with parasitic barnacles",
    correct_option: "B",
    explanation: "Berried females carry millions of fertilized orange-to-brown eggs beneath their abdomen until larval hatching."
  },
  {
    question_number: 12,
    question_text: "Which standard technique is applied in mud crab hatcheries to stimulate rapid ovarian maturation?",
    option_a: "Ascorbic acid immersion baths",
    option_b: "Unilateral eyestalk ablation",
    option_c: "Extreme chilling shock to 5°C",
    option_d: "Depriving the broodstock of oxygen",
    correct_option: "B",
    explanation: "Removing one eyestalk reduces Gonad Inhibiting Hormone (GIH) secreted by the X-organ sinus gland complex, triggering ovary development."
  },
  {
    question_number: 13,
    question_text: "What is the optimal water temperature range for mud crab growth and metabolic efficiency?",
    option_a: "14°C - 18°C",
    option_b: "20°C - 23°C",
    option_c: "27°C - 31°C",
    option_d: "37°C - 42°C",
    correct_option: "C",
    explanation: "Tropical mud crabs thrive in warm water between 27°C and 31°C. Growth and feeding plummet below 20°C."
  },
  {
    question_number: 14,
    question_text: "How can an aquaculture farmer visually differentiate an adult male mud crab from an adult female?",
    option_a: "The male has a narrow inverted T-shaped abdomen; the female has a wide, semicircular egg-carrying abdomen",
    option_b: "Males lack swimming paddles on the fifth leg",
    option_c: "Females have significantly larger claws than males of the same body weight",
    option_d: "Males have fluorescent orange markings on the carapace",
    correct_option: "A",
    explanation: "The male abdominal flap is pointed/narrow (inverted T shape), whereas the female flap is broad, rounded, and dark for holding eggs."
  },
  {
    question_number: 15,
    question_text: "In soft-shell crab production, within what critical timeframe must newly molted crabs be harvested?",
    option_a: "Within 2 to 4 hours after ecdysis (molting)",
    option_b: "48 to 72 hours post-molt",
    option_c: "After 7 days of tank conditioning",
    option_d: "Exactly 14 days after molting",
    correct_option: "A",
    explanation: "Harvest must occur within 2-4 hours before the calcium carbonate in the water causes the new cuticle to harden."
  },
  {
    question_number: 16,
    question_text: "What ecological role do mangrove forests and estuaries play for natural mud crab populations?",
    option_a: "They produce chemical repellents that drive crabs into deep ocean trenches",
    option_b: "They provide rich foraging grounds, nursery protection, and burrow shelters for crablets and sub-adults",
    option_c: "They prevent mud crabs from completing their lifecycle",
    option_d: "They eliminate all aquatic bacteria and parasites",
    correct_option: "B",
    explanation: "Mangrove roots (Rhizophora/Avicennia) offer unmatched protection, nutrient detritus, and burrowing substrate for young mud crabs."
  },
  {
    question_number: 17,
    question_text: "What live feed organism is universally provided to mud crab zoea 1 and 2 larvae in marine hatcheries?",
    option_a: "Ground soybean cake",
    option_b: "Enriched marine rotifers (Brachionus plicatilis) followed by Artemia nauplii",
    option_c: "Dehydrated spirulina flakes only",
    option_d: "Finely minced fresh chicken liver",
    correct_option: "B",
    explanation: "Zoea mouthparts require live zooplankton of suitable micron size; rotifers are essential for Zoea 1-3, transitioning to Artemia for Zoea 3-5."
  },
  {
    question_number: 18,
    question_text: "What field test confirms that a mud crab has achieved full meated condition ('hard crab') ready for top-grade sale?",
    option_a: "The underside of the carapace feels flexible and springy",
    option_b: "Firm thumb pressure on the sternum and base of walking legs (merus/carpus) yields no deflection or softening",
    option_c: "The crab voluntarily sheds its cheliped claws",
    option_d: "The crab floats when placed in saline water",
    correct_option: "B",
    explanation: "In hard crabs, the meat fills the shell completely, so pressing the ventral plate and walking leg joints feels rock-solid."
  },
  {
    question_number: 19,
    question_text: "How are live mud crabs conditioned and packed for international live export without mortality?",
    option_a: "Sealed inside airtight plastic barrels completely flooded with pure distilled water",
    option_b: "Chelipeds tied firmly to the body, packed in breathable perforated styrofoam boxes with damp mangrove leaves/jute at 20-25°C",
    option_c: "Blasted in dry ice freezers at -20°C",
    option_d: "Packed loose in dry cardboard boxes exposed to direct tropical sun",
    correct_option: "B",
    explanation: "Mud crabs can breathe atmospheric air if their gill chambers stay moist; tying chelipeds prevents fatal fights during transport."
  },
  {
    question_number: 20,
    question_text: "Why is regular water exchange (via tidal sluice gates or pumps) critical for mud crab pond health?",
    option_a: "To dissolve the mud crab carapaces for softening",
    option_b: "To replenish dissolved oxygen, purge toxic ammonia/nitrite, and stimulate synchronous molting",
    option_c: "To prevent crabs from burying themselves in sediment",
    option_d: "To wash away the crab claws",
    correct_option: "B",
    explanation: "Water exchange flushes anaerobic metabolites (H2S, NH3), replenishes minerals, and environmental shifts trigger uniform molting."
  }
];
