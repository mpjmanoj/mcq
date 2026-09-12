-- =========================================================
-- SEED 20 MUD CRAB QUESTIONS INTO SUPABASE
-- Paste and Click 'Run' in Supabase SQL Editor
-- =========================================================

-- 1. Insert Default Quiz Session
INSERT INTO quiz_sessions (id, title, status, total_questions)
VALUES ('default-session', 'Mud Crab Farming Quiz Competition', 'WAITING', 20)
ON CONFLICT (id) DO NOTHING;

-- 2. Insert 20 Mud Crab Farming Competition Questions
INSERT INTO questions (session_id, question_number, question_text, option_a, option_b, option_c, option_d, correct_option, explanation)
VALUES
(
    'default-session', 1,
    'Which commercial species of mud crab is known as the ''giant mud crab'' or ''green mud crab'' and commands the highest global market value?',
    'Scylla olivacea', 'Scylla serrata', 'Scylla paramamosain', 'Scylla tranquebarica',
    'B',
    'Scylla serrata grows to the largest size (often exceeding 1.5 - 2 kg) and commands the premium market price.'
),
(
    'default-session', 2,
    'What is the optimal water salinity range for grow-out culture and fattening of mud crabs?',
    '2 to 5 ppt', '15 to 25 ppt', '35 to 45 ppt', '0 to 1 ppt',
    'B',
    'Mud crabs thrive, molt, and maintain osmotic balance best between 15 and 25 ppt salinity.'
),
(
    'default-session', 3,
    'In mud crab aquaculture, what is the primary objective of ''crab fattening''?',
    'Hatching eggs from captive broodstock',
    'Rapidly conditioning post-molt ''water crabs'' (lean crabs) until muscle and hepatopancreas are dense and full',
    'Rearing crablets from 1g to 50g in nurseries',
    'Extracting pharmaceutical-grade chitin from shed carapaces',
    'B',
    'Fattening is a short holding process that transforms lean, post-molt water crabs into premium hard-meated crabs.'
),
(
    'default-session', 4,
    'How long does a typical mud crab fattening cycle take in aquaculture ponds, pens, or boxes?',
    '6 to 9 months', '20 to 30 days', '1 to 3 days', '12 to 15 months',
    'B',
    'Because fattening adds meat and gonadal fullness without awaiting another molt, it takes only 20 to 30 days.'
),
(
    'default-session', 5,
    'What is the most effective management intervention to minimize cannibalism during mud crab pond culture?',
    'Continuous 24-hour bright floodlights over the pond',
    'Deploying artificial shelters (PVC pipes, clay tiles, bamboo cages) on the pond floor',
    'Starving the crabs for three days between feedings',
    'Tripling stocking density to restrict territory',
    'B',
    'Shelters provide critical refuges for newly molted soft crabs when they are vulnerable to peer attacks.'
),
(
    'default-session', 6,
    'What is the ideal water pH range recommended for healthy mud crab farming ponds?',
    '4.0 - 5.5', '6.0 - 6.5', '7.5 - 8.5', '9.5 - 11.0',
    'C',
    'Slightly alkaline water (pH 7.5 to 8.5) supports proper shell hardening and prevents acidic stress.'
),
(
    'default-session', 7,
    'What is the minimum dissolved oxygen (DO) concentration that should be maintained in mud crab ponds?',
    'Above 4.0 mg/L (ppm)', 'Below 1.5 mg/L (ppm)', 'Exactly 0.5 mg/L (ppm)', '18.0 to 22.0 mg/L (ppm)',
    'A',
    'Dissolved oxygen above 4.0 mg/L ensures healthy respiration, feed intake, and disease immunity.'
),
(
    'default-session', 8,
    'What is the standard recommended daily feeding rate for mud crabs during the fattening phase?',
    '0.5% - 1% of total body weight', '5% - 10% of total body weight', '25% - 30% of total body weight', '45% - 50% of total body weight',
    'B',
    'Crabs in fattening are fed 5% to 10% of their total biomass daily, split into morning and evening rations.'
),
(
    'default-session', 9,
    'Which feed type is most widely used and biologically suited for commercial mud crab fattening?',
    'Floating grass carp herbivorous pellets',
    'Fresh or chilled trash fish, molluscs (snails/clams), and slaughterhouse byproducts',
    'Dry wheat bran and crushed corn kernels',
    'Hydrated brewer''s yeast extract',
    'B',
    'Mud crabs are carnivorous scavengers requiring high-protein wet feeds like fresh trash fish and bivalves.'
),
(
    'default-session', 10,
    'Why do modern commercial farms utilize vertical Crab House (box-cell) recirculation systems?',
    'To stimulate continuous communal mating',
    'To eliminate cannibalism, monitor individual feeding, and inspect soft-shell molting in real time',
    'To prevent crabs from ever touching water',
    'To force autotomy (claw shedding)',
    'B',
    'Individual boxes guarantee 100% protection against cannibalism and allow precise feeding and harvesting.'
),
(
    'default-session', 11,
    'What does the term ''berried female'' signify in mud crab hatchery terminology?',
    'A female crab conditioned exclusively on aquatic berries',
    'A gravid female carrying an extruded sponge/egg mass attached to abdominal pleopods',
    'A juvenile female lacking secondary sexual appendages',
    'A crab infested with parasitic barnacles',
    'B',
    'Berried females carry millions of fertilized eggs under their abdominal flap until larval hatching.'
),
(
    'default-session', 12,
    'Which standard technique is applied in mud crab hatcheries to stimulate rapid ovarian maturation?',
    'Ascorbic acid immersion baths',
    'Unilateral eyestalk ablation',
    'Extreme chilling shock to 5°C',
    'Depriving the broodstock of oxygen',
    'B',
    'Removing one eyestalk suppresses Gonad Inhibiting Hormone (GIH), inducing rapid ovarian development.'
),
(
    'default-session', 13,
    'What is the optimal water temperature range for mud crab growth and metabolic efficiency?',
    '14°C - 18°C', '20°C - 23°C', '27°C - 31°C', '37°C - 42°C',
    'C',
    'Tropical mud crabs thrive in warm water between 27°C and 31°C. Metabolic activity drops below 20°C.'
),
(
    'default-session', 14,
    'How can an aquaculture farmer visually differentiate an adult male mud crab from an adult female?',
    'The male has a narrow inverted T-shaped abdomen; the female has a wide, semicircular egg-carrying abdomen',
    'Males lack swimming paddles on the fifth leg',
    'Females have significantly larger claws than males of the same body weight',
    'Males have fluorescent orange markings on the carapace',
    'A',
    'The male abdomen is narrow and pointed, while the mature female abdomen is broad and rounded.'
),
(
    'default-session', 15,
    'In soft-shell crab production, within what critical timeframe must newly molted crabs be harvested?',
    'Within 2 to 4 hours after ecdysis (molting)', '48 to 72 hours post-molt', 'After 7 days of tank conditioning', 'Exactly 14 days after molting',
    'A',
    'Crabs must be harvested within 2 to 4 hours before dissolved minerals begin hardening the new shell.'
),
(
    'default-session', 16,
    'What ecological role do mangrove forests and estuaries play for natural mud crab populations?',
    'They produce chemical repellents that drive crabs into deep ocean trenches',
    'They provide rich foraging grounds, nursery protection, and burrow shelters for crablets and sub-adults',
    'They prevent mud crabs from completing their lifecycle',
    'They eliminate all aquatic bacteria and parasites',
    'B',
    'Mangrove root complexes provide critical detrital nutrients and protective burrowing habitats.'
),
(
    'default-session', 17,
    'What live feed organism is universally provided to mud crab zoea 1 and 2 larvae in marine hatcheries?',
    'Ground soybean cake',
    'Enriched marine rotifers (Brachionus plicatilis) followed by Artemia nauplii',
    'Dehydrated spirulina flakes only',
    'Finely minced fresh chicken liver',
    'B',
    'Microscopic marine rotifers provide the ideal live prey size and nutrition for early zoea larvae.'
),
(
    'default-session', 18,
    'What field test confirms that a mud crab has achieved full meated condition (''hard crab'') ready for top-grade sale?',
    'The underside of the carapace feels flexible and springy',
    'Firm thumb pressure on the sternum and base of walking legs yields no deflection or softening',
    'The crab voluntarily sheds its cheliped claws',
    'The crab floats when placed in saline water',
    'B',
    'In fully-meated hard crabs, firm pressure against the ventral plate and walking leg bases yields zero give.'
),
(
    'default-session', 19,
    'How are live mud crabs conditioned and packed for international live export without mortality?',
    'Sealed inside airtight plastic barrels completely flooded with pure distilled water',
    'Chelipeds tied firmly to the body, packed in breathable perforated styrofoam boxes with damp mangrove leaves/jute at 20-25°C',
    'Blasted in dry ice freezers at -20°C',
    'Packed loose in dry cardboard boxes exposed to direct tropical sun',
    'B',
    'Crabs can breathe atmospheric air if gill chambers remain moist; tying claws prevents mortal fights.'
),
(
    'default-session', 20,
    'Why is regular water exchange (via tidal sluice gates or pumps) critical for mud crab pond health?',
    'To dissolve the mud crab carapaces for softening',
    'To replenish dissolved oxygen, purge toxic ammonia/nitrite, and stimulate synchronous molting',
    'To prevent crabs from burying themselves in sediment',
    'To wash away the crab claws',
    'B',
    'Flushing pond water restores dissolved oxygen, removes ammonia metabolites, and prompts uniform molting.'
);
