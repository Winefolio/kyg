import postgres from "postgres";
import type { WineOption, PriceRange } from "@shared/schema";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error("DATABASE_URL not set");
  process.exit(1);
}

const sql = postgres(connectionString, {
  ssl: process.env.NODE_ENV === 'production' ? 'require' : false,
  max: 1,
  connect_timeout: 30,
  idle_timeout: 30
});

// Helper to create wine options
function createWineOptions(
  entry: { desc: string; askFor: string; min: number; max: number; producers: string[] },
  mid: { desc: string; askFor: string; min: number; max: number; producers: string[] },
  premium?: { desc: string; askFor: string; min: number; max: number; producers: string[] }
): WineOption[] {
  const options: WineOption[] = [
    {
      description: entry.desc,
      askFor: entry.askFor,
      priceRange: { min: entry.min, max: entry.max, currency: 'USD' },
      exampleProducers: entry.producers,
      level: 'entry'
    },
    {
      description: mid.desc,
      askFor: mid.askFor,
      priceRange: { min: mid.min, max: mid.max, currency: 'USD' },
      exampleProducers: mid.producers,
      level: 'mid'
    }
  ];

  if (premium) {
    options.push({
      description: premium.desc,
      askFor: premium.askFor,
      priceRange: { min: premium.min, max: premium.max, currency: 'USD' },
      exampleProducers: premium.producers,
      level: 'premium'
    });
  }

  return options;
}

async function seedJourneys() {
  try {
    console.log("Seeding journeys with wine options...");

    // Create Journey 1: French Wine Essentials
    const [journey1] = await sql`
      INSERT INTO journeys (title, description, difficulty_level, estimated_duration, wine_type, is_published, total_chapters)
      VALUES (
        'French Wine Essentials',
        'Discover the classic wine regions of France, from Bordeaux to Burgundy. Learn to identify key grape varieties and develop your palate for French wines.',
        'beginner',
        '4 wines',
        'mixed',
        true,
        4
      )
      ON CONFLICT DO NOTHING
      RETURNING id
    `;

    if (journey1?.id) {
      console.log("Created Journey 1:", journey1.id);

      // Chapter 1: Bordeaux
      const bordeauxOptions = createWineOptions(
        { desc: "Any Bordeaux Red", askFor: "Ask for a basic Bordeaux or Bordeaux Supérieur red under $20", min: 12, max: 20, producers: ["Mouton Cadet", "Dourthe"] },
        { desc: "Médoc or Saint-Émilion", askFor: "Ask for a Médoc or Saint-Émilion, $25-45", min: 25, max: 45, producers: ["Château Gloria", "Château Larose Trintaudon"] },
        { desc: "Classified Growth", askFor: "Ask for a Cru Bourgeois or classified growth Bordeaux", min: 50, max: 80, producers: ["Château Lynch-Bages", "Château Sociando-Mallet"] }
      );
      await sql`
        INSERT INTO chapters (journey_id, chapter_number, title, description, wine_requirements, learning_objectives, tasting_prompts, completion_criteria, wine_options)
        VALUES (
          ${journey1.id},
          1,
          'The Elegance of Bordeaux',
          'Start your French wine journey with the king of wine regions. Learn to identify the structured tannins and dark fruit flavors of Bordeaux blends.',
          ${JSON.stringify({ region: "Bordeaux", wineType: "red" })},
          ${JSON.stringify([
            "Identify Cabernet Sauvignon and Merlot blend characteristics",
            "Understand the concept of tannin structure",
            "Learn about Left Bank vs Right Bank styles"
          ])},
          ${JSON.stringify([
            { question: "What dark fruits do you taste?", category: "taste" },
            { question: "How would you describe the tannins?", category: "structure" },
            { question: "What's the finish like?", category: "structure" }
          ])},
          ${JSON.stringify({ requirePhoto: true, requireAllPrompts: false })},
          ${JSON.stringify(bordeauxOptions)}
        )
        ON CONFLICT DO NOTHING
      `;

      // Chapter 2: Burgundy
      const burgundyOptions = createWineOptions(
        { desc: "Bourgogne Rouge", askFor: "Ask for a Bourgogne Rouge (basic Burgundy red) under $25", min: 18, max: 25, producers: ["Louis Jadot", "Joseph Drouhin"] },
        { desc: "Village-level Burgundy", askFor: "Ask for a village Burgundy like Gevrey-Chambertin or Volnay, $35-55", min: 35, max: 55, producers: ["Domaine Faiveley", "Bouchard Père et Fils"] },
        { desc: "Premier Cru Burgundy", askFor: "Ask for a Premier Cru Burgundy if you want to splurge", min: 60, max: 100, producers: ["Domaine de la Romanée-Conti (village)", "Comte de Vogüé"] }
      );
      await sql`
        INSERT INTO chapters (journey_id, chapter_number, title, description, wine_requirements, learning_objectives, tasting_prompts, completion_criteria, wine_options)
        VALUES (
          ${journey1.id},
          2,
          'Burgundy: Land of Pinot Noir',
          'Explore the delicate and complex world of Burgundy Pinot Noir. Learn why this region produces some of the world''s most sought-after wines.',
          ${JSON.stringify({ region: "Burgundy", grapeVariety: "Pinot Noir" })},
          ${JSON.stringify([
            "Recognize the lighter body of Pinot Noir",
            "Identify red fruit vs black fruit characteristics",
            "Understand terroir influence on flavor"
          ])},
          ${JSON.stringify([
            { question: "What red fruits do you detect?", category: "aroma" },
            { question: "Is there any earthiness or minerality?", category: "taste" },
            { question: "How does this compare to the Bordeaux?", category: "overall" }
          ])},
          ${JSON.stringify({ requirePhoto: true, requireAllPrompts: false })},
          ${JSON.stringify(burgundyOptions)}
        )
        ON CONFLICT DO NOTHING
      `;

      // Chapter 3: Loire Valley White
      const loireOptions = createWineOptions(
        { desc: "Touraine Sauvignon Blanc", askFor: "Ask for a Touraine Sauvignon Blanc under $15", min: 10, max: 15, producers: ["Domaine de la Charmoise", "Guy Allion"] },
        { desc: "Sancerre or Pouilly-Fumé", askFor: "Ask for a Sancerre or Pouilly-Fumé, $20-35", min: 20, max: 35, producers: ["Henri Bourgeois", "Pascal Jolivet"] },
        { desc: "Single vineyard Sancerre", askFor: "Ask for a single vineyard or producer-specific Sancerre", min: 40, max: 60, producers: ["François Cotat", "Vacheron"] }
      );
      await sql`
        INSERT INTO chapters (journey_id, chapter_number, title, description, wine_requirements, learning_objectives, tasting_prompts, completion_criteria, wine_options)
        VALUES (
          ${journey1.id},
          3,
          'Loire Valley: Crisp Whites',
          'Discover the refreshing white wines of the Loire Valley. Sauvignon Blanc and Chenin Blanc showcase the region''s versatility.',
          ${JSON.stringify({ region: "Loire Valley", wineType: "white" })},
          ${JSON.stringify([
            "Distinguish Sauvignon Blanc aromatics",
            "Understand high acidity in white wines",
            "Identify citrus and mineral notes"
          ])},
          ${JSON.stringify([
            { question: "What citrus fruits do you smell?", category: "aroma" },
            { question: "How acidic is the wine?", category: "taste" },
            { question: "Is there any grassiness?", category: "aroma" }
          ])},
          ${JSON.stringify({ requirePhoto: true, requireAllPrompts: false })},
          ${JSON.stringify(loireOptions)}
        )
        ON CONFLICT DO NOTHING
      `;

      // Chapter 4: Champagne
      const champagneOptions = createWineOptions(
        { desc: "Non-vintage Brut Champagne", askFor: "Ask for a non-vintage Brut Champagne under $45", min: 35, max: 45, producers: ["Moët & Chandon", "Veuve Clicquot", "Nicolas Feuillatte"] },
        { desc: "Grower Champagne", askFor: "Ask for a grower (RM) Champagne or premium house, $50-75", min: 50, max: 75, producers: ["Pierre Gimonnet", "Larmandier-Bernier"] },
        { desc: "Vintage Champagne", askFor: "Ask for a vintage Champagne for something special", min: 80, max: 120, producers: ["Bollinger", "Pol Roger", "Louis Roederer"] }
      );
      await sql`
        INSERT INTO chapters (journey_id, chapter_number, title, description, wine_requirements, learning_objectives, tasting_prompts, completion_criteria, wine_options)
        VALUES (
          ${journey1.id},
          4,
          'Champagne: The Art of Bubbles',
          'Complete your French journey with the world''s most celebrated sparkling wine. Learn what makes Champagne unique.',
          ${JSON.stringify({ region: "Champagne", wineType: "sparkling" })},
          ${JSON.stringify([
            "Understand méthode traditionnelle",
            "Identify yeast and brioche notes",
            "Appreciate fine vs coarse bubbles"
          ])},
          ${JSON.stringify([
            { question: "Describe the bubble texture", category: "appearance" },
            { question: "Do you taste any toasty notes?", category: "taste" },
            { question: "What fruits come through?", category: "taste" }
          ])},
          ${JSON.stringify({ requirePhoto: true, requireAllPrompts: false })},
          ${JSON.stringify(champagneOptions)}
        )
        ON CONFLICT DO NOTHING
      `;
    }

    // Create Journey 2: Italian Wine Discovery
    const [journey2] = await sql`
      INSERT INTO journeys (title, description, difficulty_level, estimated_duration, wine_type, is_published, total_chapters)
      VALUES (
        'Italian Wine Discovery',
        'From the hills of Tuscany to the slopes of Piedmont, explore Italy''s incredible wine diversity. Learn about Sangiovese, Nebbiolo, and more.',
        'intermediate',
        '5 wines',
        'red',
        true,
        5
      )
      ON CONFLICT DO NOTHING
      RETURNING id
    `;

    if (journey2?.id) {
      console.log("Created Journey 2:", journey2.id);

      // Chapter 1: Chianti
      const chiantiOptions = createWineOptions(
        { desc: "Basic Chianti", askFor: "Ask for a Chianti under $15", min: 10, max: 15, producers: ["Antinori", "Ruffino"] },
        { desc: "Chianti Classico", askFor: "Ask for a Chianti Classico, $18-30", min: 18, max: 30, producers: ["Felsina", "Fontodi"] },
        { desc: "Chianti Classico Riserva", askFor: "Ask for a Chianti Classico Riserva or Gran Selezione", min: 35, max: 55, producers: ["Castello di Ama", "Isole e Olena"] }
      );
      await sql`
        INSERT INTO chapters (journey_id, chapter_number, title, description, wine_requirements, learning_objectives, tasting_prompts, completion_criteria, wine_options)
        VALUES (
          ${journey2.id},
          1,
          'Chianti: Tuscany''s Pride',
          'Begin with Italy''s most famous red wine. Learn the characteristics of Sangiovese, the backbone of Chianti.',
          ${JSON.stringify({ region: "Tuscany", grapeVariety: "Sangiovese" })},
          ${JSON.stringify([
            "Identify Sangiovese's high acidity",
            "Recognize cherry and tomato leaf notes",
            "Understand Chianti Classico DOCG"
          ])},
          ${JSON.stringify([
            { question: "What cherry notes do you taste?", category: "taste" },
            { question: "How would you rate the acidity?", category: "structure" }
          ])},
          ${JSON.stringify({ requirePhoto: true })},
          ${JSON.stringify(chiantiOptions)}
        )
        ON CONFLICT DO NOTHING
      `;

      // Chapter 2: Barolo
      const baroloOptions = createWineOptions(
        { desc: "Langhe Nebbiolo", askFor: "Ask for a Langhe Nebbiolo (baby Barolo) under $25", min: 18, max: 25, producers: ["Produttori del Barbaresco", "G.D. Vajra"] },
        { desc: "Entry Barolo", askFor: "Ask for an entry-level Barolo, $35-55", min: 35, max: 55, producers: ["Pio Cesare", "Michele Chiarlo"] },
        { desc: "Single Vineyard Barolo", askFor: "Ask for a single vineyard (cru) Barolo if available", min: 60, max: 100, producers: ["Bruno Giacosa", "Vietti"] }
      );
      await sql`
        INSERT INTO chapters (journey_id, chapter_number, title, description, wine_requirements, learning_objectives, tasting_prompts, completion_criteria, wine_options)
        VALUES (
          ${journey2.id},
          2,
          'Barolo: The King of Wines',
          'Discover the power and elegance of Nebbiolo in its finest expression - Barolo from Piedmont.',
          ${JSON.stringify({ region: "Piedmont", grapeVariety: "Nebbiolo" })},
          ${JSON.stringify([
            "Recognize Nebbiolo's deceptive color",
            "Identify tar, roses, and dried cherry",
            "Understand high tannin with high acid"
          ])},
          ${JSON.stringify([
            { question: "Is the color lighter than expected?", category: "appearance" },
            { question: "Do you detect any floral notes?", category: "aroma" },
            { question: "How are the tannins?", category: "structure" }
          ])},
          ${JSON.stringify({ requirePhoto: true })},
          ${JSON.stringify(baroloOptions)}
        )
        ON CONFLICT DO NOTHING
      `;

      // Chapter 3: Amarone
      const amaroneOptions = createWineOptions(
        { desc: "Valpolicella Ripasso", askFor: "Ask for a Valpolicella Ripasso (baby Amarone) under $25", min: 18, max: 25, producers: ["Zenato", "Bertani"] },
        { desc: "Entry Amarone", askFor: "Ask for an entry-level Amarone della Valpolicella, $40-60", min: 40, max: 60, producers: ["Tommasi", "Allegrini"] },
        { desc: "Premium Amarone", askFor: "Ask for a premium or single vineyard Amarone", min: 70, max: 120, producers: ["Dal Forno Romano", "Quintarelli"] }
      );
      await sql`
        INSERT INTO chapters (journey_id, chapter_number, title, description, wine_requirements, learning_objectives, tasting_prompts, completion_criteria, wine_options)
        VALUES (
          ${journey2.id},
          3,
          'Amarone: Dried Grape Magic',
          'Experience the rich, concentrated flavors of Amarone della Valpolicella, made from dried grapes.',
          ${JSON.stringify({ region: "Veneto" })},
          ${JSON.stringify([
            "Understand the appassimento process",
            "Identify dried fruit and chocolate notes",
            "Appreciate the full body and richness"
          ])},
          ${JSON.stringify([
            { question: "What dried fruit flavors stand out?", category: "taste" },
            { question: "Is there chocolate or coffee?", category: "taste" }
          ])},
          ${JSON.stringify({ requirePhoto: true })},
          ${JSON.stringify(amaroneOptions)}
        )
        ON CONFLICT DO NOTHING
      `;

      // Chapter 4: Brunello
      const brunelloOptions = createWineOptions(
        { desc: "Rosso di Montalcino", askFor: "Ask for a Rosso di Montalcino (baby Brunello) under $30", min: 20, max: 30, producers: ["Banfi", "Caparzo"] },
        { desc: "Entry Brunello", askFor: "Ask for an entry-level Brunello di Montalcino, $45-70", min: 45, max: 70, producers: ["Argiano", "Col d'Orcia"] },
        { desc: "Premium Brunello", askFor: "Ask for a Riserva or single vineyard Brunello", min: 80, max: 150, producers: ["Biondi-Santi", "Casanova di Neri"] }
      );
      await sql`
        INSERT INTO chapters (journey_id, chapter_number, title, description, wine_requirements, learning_objectives, tasting_prompts, completion_criteria, wine_options)
        VALUES (
          ${journey2.id},
          4,
          'Brunello di Montalcino',
          'Explore 100% Sangiovese in its most powerful form. Brunello is Tuscany''s answer to great age-worthy wines.',
          ${JSON.stringify({ region: "Montalcino", grapeVariety: "Sangiovese" })},
          ${JSON.stringify([
            "Compare Brunello to Chianti Sangiovese",
            "Identify leather and tobacco with age",
            "Understand minimum aging requirements"
          ])},
          ${JSON.stringify([
            { question: "How does this differ from Chianti?", category: "overall" },
            { question: "What secondary aromas do you notice?", category: "aroma" }
          ])},
          ${JSON.stringify({ requirePhoto: true })},
          ${JSON.stringify(brunelloOptions)}
        )
        ON CONFLICT DO NOTHING
      `;

      // Chapter 5: Super Tuscan
      const superTuscanOptions = createWineOptions(
        { desc: "Toscana IGT Red", askFor: "Ask for a Tuscan IGT red blend under $25", min: 15, max: 25, producers: ["Antinori Tignanello Sec.", "Castello di Bossi"] },
        { desc: "Mid-tier Super Tuscan", askFor: "Ask for a Super Tuscan like Lucente or Guado al Tasso, $35-55", min: 35, max: 55, producers: ["Luce della Vite (Lucente)", "Antinori Guado al Tasso"] },
        { desc: "Premium Super Tuscan", askFor: "Ask for Tignanello, Sassicaia, or Ornellaia", min: 100, max: 200, producers: ["Tignanello", "Sassicaia", "Ornellaia"] }
      );
      await sql`
        INSERT INTO chapters (journey_id, chapter_number, title, description, wine_requirements, learning_objectives, tasting_prompts, completion_criteria, wine_options)
        VALUES (
          ${journey2.id},
          5,
          'Super Tuscan: Breaking Rules',
          'Complete your Italian journey with the revolutionary Super Tuscans - wines that broke tradition to create greatness.',
          ${JSON.stringify({ region: "Tuscany", wineType: "red" })},
          ${JSON.stringify([
            "Understand why Super Tuscans emerged",
            "Identify international variety influences",
            "Appreciate the blend of tradition and innovation"
          ])},
          ${JSON.stringify([
            { question: "Can you taste both Italian and French influences?", category: "taste" },
            { question: "How would you describe the overall style?", category: "overall" }
          ])},
          ${JSON.stringify({ requirePhoto: true })},
          ${JSON.stringify(superTuscanOptions)}
        )
        ON CONFLICT DO NOTHING
      `;
    }

    // Create Journey 3: Wine Tasting Fundamentals
    const [journey3] = await sql`
      INSERT INTO journeys (title, description, difficulty_level, estimated_duration, wine_type, is_published, total_chapters)
      VALUES (
        'Wine Tasting Fundamentals',
        'Perfect for absolute beginners. Learn the basic techniques of wine tasting with any wine you have at home.',
        'beginner',
        '3 wines',
        'mixed',
        true,
        3
      )
      ON CONFLICT DO NOTHING
      RETURNING id
    `;

    if (journey3?.id) {
      console.log("Created Journey 3:", journey3.id);

      // Chapter 1: Seeing
      await sql`
        INSERT INTO chapters (journey_id, chapter_number, title, description, wine_requirements, learning_objectives, tasting_prompts, completion_criteria)
        VALUES (
          ${journey3.id},
          1,
          'See: The Visual Assessment',
          'Learn to evaluate wine by sight. Color, clarity, and viscosity tell you a lot before you even smell the wine.',
          ${JSON.stringify({ anyWine: true })},
          ${JSON.stringify([
            "Assess wine color intensity",
            "Observe the wine's clarity",
            "Check viscosity (legs/tears)"
          ])},
          ${JSON.stringify([
            { question: "Describe the color intensity", category: "appearance" },
            { question: "Is the wine clear or hazy?", category: "appearance" },
            { question: "How quickly do the legs fall?", category: "appearance" }
          ])},
          ${JSON.stringify({ requirePhoto: true })}
        )
        ON CONFLICT DO NOTHING
      `;

      // Chapter 2: Smelling
      await sql`
        INSERT INTO chapters (journey_id, chapter_number, title, description, wine_requirements, learning_objectives, tasting_prompts, completion_criteria)
        VALUES (
          ${journey3.id},
          2,
          'Smell: The Aromatic Journey',
          'Your nose is your most powerful tasting tool. Learn to identify primary, secondary, and tertiary aromas.',
          ${JSON.stringify({ anyWine: true })},
          ${JSON.stringify([
            "Distinguish fruit aromas (primary)",
            "Identify fermentation aromas (secondary)",
            "Recognize aging aromas (tertiary)"
          ])},
          ${JSON.stringify([
            { question: "What fruits do you smell?", category: "aroma" },
            { question: "Is there any yeasty or bread-like smell?", category: "aroma" },
            { question: "Do you detect vanilla, oak, or spices?", category: "aroma" }
          ])},
          ${JSON.stringify({ requirePhoto: true })}
        )
        ON CONFLICT DO NOTHING
      `;

      // Chapter 3: Tasting
      await sql`
        INSERT INTO chapters (journey_id, chapter_number, title, description, wine_requirements, learning_objectives, tasting_prompts, completion_criteria)
        VALUES (
          ${journey3.id},
          3,
          'Taste: Putting It All Together',
          'Finally, the sip! Learn to evaluate sweetness, acidity, tannin, body, and finish.',
          ${JSON.stringify({ anyWine: true })},
          ${JSON.stringify([
            "Identify sweetness levels",
            "Evaluate acidity (mouth-watering sensation)",
            "Feel tannins (drying sensation)",
            "Assess body (weight in mouth)"
          ])},
          ${JSON.stringify([
            { question: "Is the wine sweet, off-dry, or dry?", category: "taste" },
            { question: "Does your mouth water? (acidity)", category: "taste" },
            { question: "Is there a drying sensation? (tannins)", category: "structure" },
            { question: "Does it feel light or full-bodied?", category: "structure" }
          ])},
          ${JSON.stringify({ requirePhoto: true })}
        )
        ON CONFLICT DO NOTHING
      `;
    }

    // ========================================
    // Journey 4: New World Grapes
    // ========================================
    const [journey4] = await sql`
      INSERT INTO journeys (title, description, difficulty_level, estimated_duration, wine_type, is_published, total_chapters)
      VALUES (
        'New World Grapes',
        'Explore four major grape varieties through their New World expressions. Learn what makes Cabernet, Pinot Noir, Chardonnay, and Sauvignon Blanc unique.',
        'beginner',
        '4 wines',
        'mixed',
        true,
        4
      )
      ON CONFLICT DO NOTHING
      RETURNING id
    `;

    if (journey4?.id) {
      console.log("Created Journey 4 (New World Grapes):", journey4.id);

      // Chapter 1: Cabernet Sauvignon
      const cabOptions = createWineOptions(
        { desc: "California Cabernet under $20", askFor: "Ask for a California Cabernet Sauvignon under $20", min: 12, max: 20, producers: ["Josh Cellars", "Bogle", "14 Hands"] },
        { desc: "Napa or Sonoma Cabernet", askFor: "Ask for a Napa Valley or Sonoma Cabernet, $30-50", min: 30, max: 50, producers: ["Caymus", "Silver Oak", "Jordan"] },
        { desc: "Premium Napa Cabernet", askFor: "Ask for a premium Napa Cabernet from a single vineyard", min: 75, max: 150, producers: ["Opus One", "Stag's Leap", "Chateau Montelena"] }
      );
      await sql`
        INSERT INTO chapters (journey_id, chapter_number, title, description, wine_requirements, learning_objectives, tasting_prompts, completion_criteria, wine_options)
        VALUES (
          ${journey4.id},
          1,
          'Cabernet Sauvignon: The King Grape',
          'Start with the world''s most planted premium red grape. California Cabernet shows power, ripe fruit, and American oak influence.',
          ${JSON.stringify({ grapeVariety: "Cabernet Sauvignon" })},
          ${JSON.stringify([
            "Identify dark fruit flavors (blackcurrant, black cherry)",
            "Recognize oak influence (vanilla, cedar)",
            "Understand tannin structure in Cabernet"
          ])},
          ${JSON.stringify([
            { question: "What dark fruits do you taste?", category: "taste" },
            { question: "Do you notice any vanilla or cedar?", category: "aroma" },
            { question: "How do the tannins feel?", category: "structure" }
          ])},
          ${JSON.stringify({ requirePhoto: true })},
          ${JSON.stringify(cabOptions)}
        )
        ON CONFLICT DO NOTHING
      `;

      // Chapter 2: Pinot Noir
      const pinotOptions = createWineOptions(
        { desc: "California or Oregon Pinot under $20", askFor: "Ask for a California or Oregon Pinot Noir under $20", min: 12, max: 20, producers: ["Meiomi", "A to Z", "La Crema"] },
        { desc: "Oregon Willamette or Russian River", askFor: "Ask for an Oregon Willamette Valley or Sonoma Russian River Pinot, $25-45", min: 25, max: 45, producers: ["Domaine Drouhin Oregon", "Williams Selyem"] },
        { desc: "Single Vineyard Pinot", askFor: "Ask for a single vineyard Pinot Noir from Oregon or California", min: 50, max: 80, producers: ["Beaux Frères", "Kosta Browne"] }
      );
      await sql`
        INSERT INTO chapters (journey_id, chapter_number, title, description, wine_requirements, learning_objectives, tasting_prompts, completion_criteria, wine_options)
        VALUES (
          ${journey4.id},
          2,
          'Pinot Noir: The Heartbreak Grape',
          'Discover why Pinot Noir is loved by sommeliers but hard to grow. Compare its elegance to Cabernet''s power.',
          ${JSON.stringify({ grapeVariety: "Pinot Noir" })},
          ${JSON.stringify([
            "Recognize lighter body compared to Cabernet",
            "Identify red fruit vs dark fruit",
            "Notice lower tannins and earthy notes"
          ])},
          ${JSON.stringify([
            { question: "What red fruits do you taste?", category: "taste" },
            { question: "How does the body compare to Cabernet?", category: "structure" },
            { question: "Is there any earthiness?", category: "aroma" }
          ])},
          ${JSON.stringify({ requirePhoto: true })},
          ${JSON.stringify(pinotOptions)}
        )
        ON CONFLICT DO NOTHING
      `;

      // Chapter 3: Chardonnay
      const chardOptions = createWineOptions(
        { desc: "California Chardonnay under $15", askFor: "Ask for a California Chardonnay under $15", min: 10, max: 15, producers: ["Kendall-Jackson", "La Crema", "Rombauer"] },
        { desc: "Sonoma or Central Coast Chardonnay", askFor: "Ask for a Sonoma or Central Coast Chardonnay, $20-35", min: 20, max: 35, producers: ["Cakebread", "Mer Soleil"] },
        { desc: "Premium California Chardonnay", askFor: "Ask for a premium California Chardonnay (Napa or Sonoma)", min: 40, max: 70, producers: ["Kistler", "Peter Michael"] }
      );
      await sql`
        INSERT INTO chapters (journey_id, chapter_number, title, description, wine_requirements, learning_objectives, tasting_prompts, completion_criteria, wine_options)
        VALUES (
          ${journey4.id},
          3,
          'Chardonnay: The Winemaker''s Canvas',
          'Explore the most versatile white grape. Learn how winemaking choices (oak vs steel, malolactic) shape the final wine.',
          ${JSON.stringify({ grapeVariety: "Chardonnay" })},
          ${JSON.stringify([
            "Identify oak influence (butter, vanilla)",
            "Recognize fruit differences (citrus vs tropical)",
            "Understand malolactic fermentation"
          ])},
          ${JSON.stringify([
            { question: "Is this oaked or unoaked?", category: "taste" },
            { question: "What fruits do you taste?", category: "taste" },
            { question: "Is there a creamy/buttery texture?", category: "structure" }
          ])},
          ${JSON.stringify({ requirePhoto: true })},
          ${JSON.stringify(chardOptions)}
        )
        ON CONFLICT DO NOTHING
      `;

      // Chapter 4: Sauvignon Blanc
      const sbOptions = createWineOptions(
        { desc: "New Zealand Sauvignon Blanc under $15", askFor: "Ask for a Marlborough Sauvignon Blanc under $15", min: 10, max: 15, producers: ["Oyster Bay", "Kim Crawford", "Cloudy Bay"] },
        { desc: "Premium NZ or California SB", askFor: "Ask for a premium NZ Sauvignon Blanc or California, $18-30", min: 18, max: 30, producers: ["Dog Point", "Cloudy Bay Te Koko"] },
        { desc: "Single Vineyard SB", askFor: "Ask for a single vineyard Marlborough Sauvignon Blanc", min: 30, max: 50, producers: ["Clos Henri", "Greywacke"] }
      );
      await sql`
        INSERT INTO chapters (journey_id, chapter_number, title, description, wine_requirements, learning_objectives, tasting_prompts, completion_criteria, wine_options)
        VALUES (
          ${journey4.id},
          4,
          'Sauvignon Blanc: Aromatic Explosion',
          'Complete your grape journey with the most aromatic white. New Zealand put this variety on the map worldwide.',
          ${JSON.stringify({ grapeVariety: "Sauvignon Blanc" })},
          ${JSON.stringify([
            "Identify grassy, herbal notes",
            "Recognize tropical vs citrus fruit",
            "Appreciate high acidity"
          ])},
          ${JSON.stringify([
            { question: "What herbs or grass do you smell?", category: "aroma" },
            { question: "Is it more citrus or tropical?", category: "taste" },
            { question: "How does the acidity compare to Chardonnay?", category: "structure" }
          ])},
          ${JSON.stringify({ requirePhoto: true })},
          ${JSON.stringify(sbOptions)}
        )
        ON CONFLICT DO NOTHING
      `;
    }

    // ========================================
    // Journey 5: Oregon Pinot Deep Dive
    // ========================================
    const [journey5] = await sql`
      INSERT INTO journeys (title, description, difficulty_level, estimated_duration, wine_type, is_published, total_chapters)
      VALUES (
        'Oregon Pinot Deep Dive',
        'A focused exploration of Pinot Noir through Oregon''s diverse wine regions. Progress from entry-level to single vineyard expressions.',
        'intermediate',
        '4 wines',
        'red',
        true,
        4
      )
      ON CONFLICT DO NOTHING
      RETURNING id
    `;

    if (journey5?.id) {
      console.log("Created Journey 5 (Oregon Pinot Deep Dive):", journey5.id);

      // Chapter 1: Entry Oregon Pinot
      const oregonEntryOptions = createWineOptions(
        { desc: "Oregon Pinot Noir under $20", askFor: "Ask for any Oregon Pinot Noir under $20", min: 15, max: 20, producers: ["A to Z", "Erath", "King Estate"] },
        { desc: "Oregon AVA Pinot", askFor: "Ask for an Oregon Pinot with an AVA designation, $25-35", min: 25, max: 35, producers: ["Willamette Valley Vineyards", "Ponzi"] }
      );
      await sql`
        INSERT INTO chapters (journey_id, chapter_number, title, description, wine_requirements, learning_objectives, tasting_prompts, completion_criteria, wine_options)
        VALUES (
          ${journey5.id},
          1,
          'Oregon Pinot: First Taste',
          'Begin your Oregon journey with an accessible Pinot Noir. Learn what makes Oregon a world-class Pinot region.',
          ${JSON.stringify({ region: "Oregon", grapeVariety: "Pinot Noir" })},
          ${JSON.stringify([
            "Understand Oregon's climate for Pinot",
            "Identify typical Oregon Pinot characteristics",
            "Compare to California Pinot style"
          ])},
          ${JSON.stringify([
            { question: "What fruits stand out?", category: "taste" },
            { question: "Is there any earthiness?", category: "aroma" },
            { question: "How would you describe the acidity?", category: "structure" }
          ])},
          ${JSON.stringify({ requirePhoto: true })},
          ${JSON.stringify(oregonEntryOptions)}
        )
        ON CONFLICT DO NOTHING
      `;

      // Chapter 2: Willamette Valley
      const willametteOptions = createWineOptions(
        { desc: "Willamette Valley Pinot", askFor: "Ask specifically for Willamette Valley Pinot Noir, $25-40", min: 25, max: 40, producers: ["Sokol Blosser", "Domaine Serene", "Rex Hill"] },
        { desc: "Premium Willamette", askFor: "Ask for a premium Willamette Valley producer, $45-65", min: 45, max: 65, producers: ["Adelsheim", "Ken Wright"] },
        { desc: "Top Willamette Producer", askFor: "Ask for a top Willamette producer if you want to splurge", min: 70, max: 100, producers: ["Domaine Drouhin Oregon", "Beaux Frères"] }
      );
      await sql`
        INSERT INTO chapters (journey_id, chapter_number, title, description, wine_requirements, learning_objectives, tasting_prompts, completion_criteria, wine_options)
        VALUES (
          ${journey5.id},
          2,
          'Willamette Valley: The Heart of Oregon Wine',
          'Focus on Oregon''s flagship wine region. Willamette Valley produces 90% of Oregon Pinot Noir.',
          ${JSON.stringify({ region: "Willamette Valley", grapeVariety: "Pinot Noir" })},
          ${JSON.stringify([
            "Understand Willamette Valley geography",
            "Notice increased complexity",
            "Compare to Chapter 1 wine"
          ])},
          ${JSON.stringify([
            { question: "Is this more complex than Chapter 1?", category: "overall" },
            { question: "What new flavors do you notice?", category: "taste" },
            { question: "How does the finish compare?", category: "structure" }
          ])},
          ${JSON.stringify({ requirePhoto: true })},
          ${JSON.stringify(willametteOptions)}
        )
        ON CONFLICT DO NOTHING
      `;

      // Chapter 3: Sub-AVA (Dundee Hills, Eola-Amity, etc.)
      const subAvaOptions = createWineOptions(
        { desc: "Named Sub-AVA Pinot", askFor: "Ask for a Pinot from Dundee Hills, Eola-Amity, or Ribbon Ridge, $35-55", min: 35, max: 55, producers: ["Archery Summit", "Evening Land", "Cristom"] },
        { desc: "Premium Sub-AVA Pinot", askFor: "Ask for a premium sub-AVA specific Pinot, $60-85", min: 60, max: 85, producers: ["Domaine Serene (Evenstad)", "White Rose"] },
        { desc: "Single Vineyard from Sub-AVA", askFor: "Ask for a single vineyard from a specific sub-AVA", min: 85, max: 120, producers: ["Shea Wine Cellars", "Patricia Green Cellars"] }
      );
      await sql`
        INSERT INTO chapters (journey_id, chapter_number, title, description, wine_requirements, learning_objectives, tasting_prompts, completion_criteria, wine_options)
        VALUES (
          ${journey5.id},
          3,
          'Exploring Sub-AVAs: Terroir Differences',
          'Discover how different sub-regions within Willamette create distinct wines. Dundee Hills, Eola-Amity, and Ribbon Ridge each have unique characters.',
          ${JSON.stringify({ region: "Willamette Valley", grapeVariety: "Pinot Noir" })},
          ${JSON.stringify([
            "Learn major Willamette sub-AVAs",
            "Identify terroir-driven differences",
            "Understand soil and elevation impacts"
          ])},
          ${JSON.stringify([
            { question: "What sub-AVA is this from?", category: "overall" },
            { question: "How does terroir show in the wine?", category: "taste" },
            { question: "What makes this unique?", category: "overall" }
          ])},
          ${JSON.stringify({ requirePhoto: true })},
          ${JSON.stringify(subAvaOptions)}
        )
        ON CONFLICT DO NOTHING
      `;

      // Chapter 4: Single Vineyard Premium
      const premiumOptions = createWineOptions(
        { desc: "Single Vineyard Oregon Pinot", askFor: "Ask for a single vineyard Oregon Pinot Noir, $50-80", min: 50, max: 80, producers: ["Ken Wright Cellars (various vineyards)", "Bergström"] },
        { desc: "Premium Single Vineyard", askFor: "Ask for a premium single vineyard from a top producer, $80-120", min: 80, max: 120, producers: ["Beaux Frères (Beaux Frères Vineyard)", "Domaine Drouhin (Louise Drouhin)"] },
        { desc: "Collector's Oregon Pinot", askFor: "Ask for a collector-grade Oregon Pinot if available", min: 120, max: 200, producers: ["Evening Land (Seven Springs)", "Antica Terra"] }
      );
      await sql`
        INSERT INTO chapters (journey_id, chapter_number, title, description, wine_requirements, learning_objectives, tasting_prompts, completion_criteria, wine_options)
        VALUES (
          ${journey5.id},
          4,
          'Single Vineyard: The Ultimate Expression',
          'Complete your journey with a single vineyard Pinot that shows the purest expression of one specific site.',
          ${JSON.stringify({ region: "Oregon", grapeVariety: "Pinot Noir" })},
          ${JSON.stringify([
            "Understand single vineyard importance",
            "Taste site-specific character",
            "Appreciate Oregon's potential"
          ])},
          ${JSON.stringify([
            { question: "How does this differ from blended wines?", category: "overall" },
            { question: "What makes this vineyard special?", category: "taste" },
            { question: "Would you age this wine?", category: "overall" }
          ])},
          ${JSON.stringify({ requirePhoto: true })},
          ${JSON.stringify(premiumOptions)}
        )
        ON CONFLICT DO NOTHING
      `;
    }

    // ========================================
    // Journey 6: Spanish Wine Essentials
    // ========================================
    const [journey6] = await sql`
      INSERT INTO journeys (title, description, difficulty_level, estimated_duration, wine_type, is_published, total_chapters)
      VALUES (
        'Spanish Wine Essentials',
        'Discover Spain''s incredible wine diversity, from the elegant Tempranillo of Rioja to the powerful reds of Ribera del Duero and Priorat.',
        'beginner',
        '4 wines',
        'red',
        true,
        4
      )
      ON CONFLICT DO NOTHING
      RETURNING id
    `;

    if (journey6?.id) {
      console.log("Created Journey 6 (Spanish Wine Essentials):", journey6.id);

      // Chapter 1: Rioja
      const riojaOptions = createWineOptions(
        { desc: "Rioja Crianza", askFor: "Ask for a Rioja Crianza under $18", min: 12, max: 18, producers: ["Marqués de Cáceres", "CVNE", "Bodegas Muga"] },
        { desc: "Rioja Reserva", askFor: "Ask for a Rioja Reserva, $20-35", min: 20, max: 35, producers: ["La Rioja Alta", "López de Heredia", "Marqués de Riscal"] },
        { desc: "Rioja Gran Reserva", askFor: "Ask for a Rioja Gran Reserva for something special", min: 40, max: 70, producers: ["López de Heredia (Viña Tondonia)", "CVNE (Imperial)"] }
      );
      await sql`
        INSERT INTO chapters (journey_id, chapter_number, title, description, wine_requirements, learning_objectives, tasting_prompts, completion_criteria, wine_options)
        VALUES (
          ${journey6.id},
          1,
          'Rioja: Spain''s Classic Red',
          'Begin with Spain''s most famous wine region. Learn how Tempranillo expresses itself with traditional oak aging.',
          ${JSON.stringify({ region: "Rioja", grapeVariety: "Tempranillo" })},
          ${JSON.stringify([
            "Understand Crianza, Reserva, Gran Reserva aging levels",
            "Identify Tempranillo's cherry and leather notes",
            "Recognize American vs French oak influence"
          ])},
          ${JSON.stringify([
            { question: "What fruits do you taste?", category: "taste" },
            { question: "Do you notice vanilla or coconut (American oak)?", category: "aroma" },
            { question: "Is there leather or tobacco?", category: "aroma" }
          ])},
          ${JSON.stringify({ requirePhoto: true })},
          ${JSON.stringify(riojaOptions)}
        )
        ON CONFLICT DO NOTHING
      `;

      // Chapter 2: Ribera del Duero
      const riberaOptions = createWineOptions(
        { desc: "Ribera del Duero Roble/Joven", askFor: "Ask for a young Ribera del Duero under $20", min: 14, max: 20, producers: ["Protos", "Pesquera", "Condado de Haza"] },
        { desc: "Ribera del Duero Crianza", askFor: "Ask for a Ribera del Duero Crianza, $25-45", min: 25, max: 45, producers: ["Pago de Carraovejas", "Emilio Moro"] },
        { desc: "Premium Ribera", askFor: "Ask for a premium Ribera del Duero like Pingus or Vega Sicilia", min: 60, max: 150, producers: ["Vega Sicilia (Valbuena)", "Dominio de Pingus (Flor de Pingus)"] }
      );
      await sql`
        INSERT INTO chapters (journey_id, chapter_number, title, description, wine_requirements, learning_objectives, tasting_prompts, completion_criteria, wine_options)
        VALUES (
          ${journey6.id},
          2,
          'Ribera del Duero: Power and Elegance',
          'Discover Tempranillo''s more powerful expression. Higher altitude and continental climate create bolder wines.',
          ${JSON.stringify({ region: "Ribera del Duero", grapeVariety: "Tempranillo" })},
          ${JSON.stringify([
            "Compare Ribera style to Rioja",
            "Understand altitude's impact on wine",
            "Identify darker fruit and more tannin"
          ])},
          ${JSON.stringify([
            { question: "How does this compare to Rioja?", category: "overall" },
            { question: "Are the tannins stronger?", category: "structure" },
            { question: "What dark fruits do you taste?", category: "taste" }
          ])},
          ${JSON.stringify({ requirePhoto: true })},
          ${JSON.stringify(riberaOptions)}
        )
        ON CONFLICT DO NOTHING
      `;

      // Chapter 3: Priorat
      const prioratOptions = createWineOptions(
        { desc: "Entry Priorat", askFor: "Ask for an entry-level Priorat or Vi de Vila, $20-30", min: 20, max: 30, producers: ["Clos Mogador (Manyetes)", "Torres (Salmos)", "Alvaro Palacios (Camins)"] },
        { desc: "Priorat DOQ", askFor: "Ask for a Priorat DOQ, $35-55", min: 35, max: 55, producers: ["Clos Figueras", "Mas Doix", "Terroir al Limit"] },
        { desc: "Premium Priorat", askFor: "Ask for L'Ermita, Clos Mogador, or similar", min: 70, max: 200, producers: ["Alvaro Palacios (L'Ermita)", "Clos Mogador", "Clos Erasmus"] }
      );
      await sql`
        INSERT INTO chapters (journey_id, chapter_number, title, description, wine_requirements, learning_objectives, tasting_prompts, completion_criteria, wine_options)
        VALUES (
          ${journey6.id},
          3,
          'Priorat: Mineral-Rich Power',
          'Experience Spain''s most prestigious region. Llicorella slate soils create wines of incredible intensity and minerality.',
          ${JSON.stringify({ region: "Priorat" })},
          ${JSON.stringify([
            "Understand Garnacha and Cariñena blends",
            "Identify mineral/slate character",
            "Appreciate old vine concentration"
          ])},
          ${JSON.stringify([
            { question: "Do you taste any minerality?", category: "taste" },
            { question: "How intense is the wine?", category: "structure" },
            { question: "What spices do you detect?", category: "aroma" }
          ])},
          ${JSON.stringify({ requirePhoto: true })},
          ${JSON.stringify(prioratOptions)}
        )
        ON CONFLICT DO NOTHING
      `;

      // Chapter 4: Garnacha
      const garnachaOptions = createWineOptions(
        { desc: "Campo de Borja or Calatayud Garnacha", askFor: "Ask for a Garnacha from Aragon under $15", min: 10, max: 15, producers: ["Borsao", "El Escocés Volante", "Corona de Aragón"] },
        { desc: "Old Vine Garnacha", askFor: "Ask for an old vine Garnacha, $18-30", min: 18, max: 30, producers: ["Alto Moncayo", "Bodegas San Alejandro (Las Rocas)"] },
        { desc: "Premium Garnacha", askFor: "Ask for a premium single vineyard Garnacha", min: 35, max: 60, producers: ["Comando G", "4 Monos"] }
      );
      await sql`
        INSERT INTO chapters (journey_id, chapter_number, title, description, wine_requirements, learning_objectives, tasting_prompts, completion_criteria, wine_options)
        VALUES (
          ${journey6.id},
          4,
          'Garnacha: Spain''s Hidden Gem',
          'Complete your Spanish journey with Garnacha (Grenache). Old vines in Aragon produce amazing value wines.',
          ${JSON.stringify({ grapeVariety: "Garnacha" })},
          ${JSON.stringify([
            "Recognize Garnacha's red fruit and spice",
            "Understand old vine value",
            "Compare Spanish vs French Grenache"
          ])},
          ${JSON.stringify([
            { question: "What red fruits do you taste?", category: "taste" },
            { question: "Is there any spice or herbs?", category: "aroma" },
            { question: "How does this compare to Priorat?", category: "overall" }
          ])},
          ${JSON.stringify({ requirePhoto: true })},
          ${JSON.stringify(garnachaOptions)}
        )
        ON CONFLICT DO NOTHING
      `;
    }

    // ========================================
    // Journey 7: Bold Reds of the World
    // ========================================
    const [journey7] = await sql`
      INSERT INTO journeys (title, description, difficulty_level, estimated_duration, wine_type, is_published, total_chapters)
      VALUES (
        'Bold Reds of the World',
        'For lovers of big, powerful red wines. Explore Malbec, Shiraz, Zinfandel, and Petite Sirah - wines that make a statement.',
        'beginner',
        '4 wines',
        'red',
        true,
        4
      )
      ON CONFLICT DO NOTHING
      RETURNING id
    `;

    if (journey7?.id) {
      console.log("Created Journey 7 (Bold Reds of the World):", journey7.id);

      // Chapter 1: Argentine Malbec
      const malbecOptions = createWineOptions(
        { desc: "Mendoza Malbec under $15", askFor: "Ask for a Mendoza Malbec under $15", min: 10, max: 15, producers: ["Alamos", "Trivento", "Trapiche"] },
        { desc: "High Altitude Malbec", askFor: "Ask for a high altitude Malbec from Uco Valley, $20-35", min: 20, max: 35, producers: ["Catena", "Zuccardi", "Achaval Ferrer"] },
        { desc: "Premium Argentine Malbec", askFor: "Ask for a premium single vineyard Malbec", min: 45, max: 80, producers: ["Catena Zapata (Adrianna)", "Cobos", "Cheval des Andes"] }
      );
      await sql`
        INSERT INTO chapters (journey_id, chapter_number, title, description, wine_requirements, learning_objectives, tasting_prompts, completion_criteria, wine_options)
        VALUES (
          ${journey7.id},
          1,
          'Argentine Malbec: Plush and Powerful',
          'Start with the world''s most popular bold red. Argentina''s high altitude vineyards produce incredibly rich, fruit-forward Malbec.',
          ${JSON.stringify({ region: "Argentina", grapeVariety: "Malbec" })},
          ${JSON.stringify([
            "Identify Malbec's signature plum and violet notes",
            "Understand high altitude winemaking",
            "Recognize soft, velvety tannins"
          ])},
          ${JSON.stringify([
            { question: "What dark fruits do you taste?", category: "taste" },
            { question: "Do you detect any violet or floral notes?", category: "aroma" },
            { question: "How would you describe the tannins?", category: "structure" }
          ])},
          ${JSON.stringify({ requirePhoto: true })},
          ${JSON.stringify(malbecOptions)}
        )
        ON CONFLICT DO NOTHING
      `;

      // Chapter 2: Australian Shiraz
      const shirazOptions = createWineOptions(
        { desc: "Australian Shiraz under $18", askFor: "Ask for an Australian Shiraz under $18", min: 12, max: 18, producers: ["Penfolds Koonunga Hill", "Jacob's Creek", "19 Crimes"] },
        { desc: "Barossa or McLaren Vale Shiraz", askFor: "Ask for a Barossa Valley or McLaren Vale Shiraz, $25-45", min: 25, max: 45, producers: ["d'Arenberg", "Torbreck", "Two Hands"] },
        { desc: "Premium Australian Shiraz", askFor: "Ask for a premium Australian Shiraz if you want to splurge", min: 50, max: 100, producers: ["Penfolds (Bin 389, Bin 150)", "Henschke", "Clarendon Hills"] }
      );
      await sql`
        INSERT INTO chapters (journey_id, chapter_number, title, description, wine_requirements, learning_objectives, tasting_prompts, completion_criteria, wine_options)
        VALUES (
          ${journey7.id},
          2,
          'Australian Shiraz: Bold Down Under',
          'Experience the rich, jammy style of Australian Shiraz. Warm climate regions produce wines with incredible fruit intensity.',
          ${JSON.stringify({ region: "Australia", grapeVariety: "Shiraz" })},
          ${JSON.stringify([
            "Compare Shiraz style to Malbec",
            "Identify black pepper and meat notes",
            "Recognize eucalyptus/mint character"
          ])},
          ${JSON.stringify([
            { question: "Do you taste black pepper?", category: "taste" },
            { question: "Is there any eucalyptus or mint?", category: "aroma" },
            { question: "How does the fruit compare to Malbec?", category: "overall" }
          ])},
          ${JSON.stringify({ requirePhoto: true })},
          ${JSON.stringify(shirazOptions)}
        )
        ON CONFLICT DO NOTHING
      `;

      // Chapter 3: California Zinfandel
      const zinfandelOptions = createWineOptions(
        { desc: "California Zinfandel under $18", askFor: "Ask for a California Zinfandel under $18", min: 12, max: 18, producers: ["Ravenswood", "Seghesio", "Bogle Old Vine"] },
        { desc: "Sonoma or Lodi Old Vine Zin", askFor: "Ask for an old vine Zinfandel from Sonoma or Lodi, $22-40", min: 22, max: 40, producers: ["Ridge", "Turley", "Robert Biale"] },
        { desc: "Premium Single Vineyard Zin", askFor: "Ask for a single vineyard old vine Zinfandel", min: 45, max: 75, producers: ["Ridge (Geyserville, Lytton Springs)", "Turley (single vineyard)"] }
      );
      await sql`
        INSERT INTO chapters (journey_id, chapter_number, title, description, wine_requirements, learning_objectives, tasting_prompts, completion_criteria, wine_options)
        VALUES (
          ${journey7.id},
          3,
          'California Zinfandel: America''s Grape',
          'Discover California''s signature bold red. Old vine Zinfandel delivers jammy fruit, spice, and impressive alcohol.',
          ${JSON.stringify({ region: "California", grapeVariety: "Zinfandel" })},
          ${JSON.stringify([
            "Identify bramble fruit and jam notes",
            "Recognize baking spice character",
            "Understand old vine concentration"
          ])},
          ${JSON.stringify([
            { question: "What jammy fruits do you taste?", category: "taste" },
            { question: "Is there cinnamon or clove?", category: "aroma" },
            { question: "How does the alcohol feel?", category: "structure" }
          ])},
          ${JSON.stringify({ requirePhoto: true })},
          ${JSON.stringify(zinfandelOptions)}
        )
        ON CONFLICT DO NOTHING
      `;

      // Chapter 4: Petite Sirah
      const petiteSirahOptions = createWineOptions(
        { desc: "California Petite Sirah under $20", askFor: "Ask for a California Petite Sirah under $20", min: 14, max: 20, producers: ["Bogle", "Concannon", "Michael David"] },
        { desc: "Lodi or Paso Robles PS", askFor: "Ask for a Lodi or Paso Robles Petite Sirah, $25-40", min: 25, max: 40, producers: ["Turley", "Stags' Leap Winery"] },
        { desc: "Premium Petite Sirah", askFor: "Ask for a premium or old vine Petite Sirah", min: 45, max: 70, producers: ["Turley (Hayne, Pesenti)", "Foppiano"] }
      );
      await sql`
        INSERT INTO chapters (journey_id, chapter_number, title, description, wine_requirements, learning_objectives, tasting_prompts, completion_criteria, wine_options)
        VALUES (
          ${journey7.id},
          4,
          'Petite Sirah: The Inky Giant',
          'Complete your bold reds journey with the darkest, most tannic variety. Petite Sirah is not for the faint of heart.',
          ${JSON.stringify({ grapeVariety: "Petite Sirah" })},
          ${JSON.stringify([
            "Appreciate intense color and tannins",
            "Identify blueberry and dark chocolate",
            "Understand why it's a cult favorite"
          ])},
          ${JSON.stringify([
            { question: "How dark is the color?", category: "appearance" },
            { question: "Do you taste blueberry or blackberry?", category: "taste" },
            { question: "How intense are the tannins?", category: "structure" }
          ])},
          ${JSON.stringify({ requirePhoto: true })},
          ${JSON.stringify(petiteSirahOptions)}
        )
        ON CONFLICT DO NOTHING
      `;
    }

    // ========================================
    // Journey 8: White Wine Mastery
    // ========================================
    const [journey8] = await sql`
      INSERT INTO journeys (title, description, difficulty_level, estimated_duration, wine_type, is_published, total_chapters)
      VALUES (
        'White Wine Mastery',
        'Go beyond Chardonnay and Sauvignon Blanc. Discover Riesling, Grüner Veltliner, Chenin Blanc, and Albariño.',
        'intermediate',
        '4 wines',
        'white',
        true,
        4
      )
      ON CONFLICT DO NOTHING
      RETURNING id
    `;

    if (journey8?.id) {
      console.log("Created Journey 8 (White Wine Mastery):", journey8.id);

      // Chapter 1: Riesling
      const rieslingOptions = createWineOptions(
        { desc: "German Kabinett Riesling", askFor: "Ask for a German Kabinett Riesling under $20", min: 14, max: 20, producers: ["Dr. Loosen", "Selbach-Oster", "Joh. Jos. Prüm"] },
        { desc: "Alsace or German Spätlese", askFor: "Ask for an Alsace Riesling or German Spätlese, $22-40", min: 22, max: 40, producers: ["Trimbach", "Domaine Weinbach", "Fritz Haag"] },
        { desc: "Grand Cru Riesling", askFor: "Ask for an Alsace Grand Cru or German GG Riesling", min: 45, max: 80, producers: ["Trimbach (Clos Ste Hune)", "Dönnhoff (GG)", "Keller"] }
      );
      await sql`
        INSERT INTO chapters (journey_id, chapter_number, title, description, wine_requirements, learning_objectives, tasting_prompts, completion_criteria, wine_options)
        VALUES (
          ${journey8.id},
          1,
          'Riesling: The Noble White',
          'Discover why sommeliers love Riesling. From bone-dry to lusciously sweet, no grape offers more versatility.',
          ${JSON.stringify({ grapeVariety: "Riesling" })},
          ${JSON.stringify([
            "Identify petrol/kerosene notes (aged Riesling)",
            "Understand German Prädikat system",
            "Appreciate high acidity with sweetness balance"
          ])},
          ${JSON.stringify([
            { question: "Is this dry, off-dry, or sweet?", category: "taste" },
            { question: "What citrus fruits do you taste?", category: "taste" },
            { question: "Is there any petrol or mineral character?", category: "aroma" }
          ])},
          ${JSON.stringify({ requirePhoto: true })},
          ${JSON.stringify(rieslingOptions)}
        )
        ON CONFLICT DO NOTHING
      `;

      // Chapter 2: Grüner Veltliner
      const grunerOptions = createWineOptions(
        { desc: "Austrian Grüner Veltliner under $18", askFor: "Ask for an Austrian Grüner Veltliner under $18", min: 12, max: 18, producers: ["Laurenz V", "Hugl", "Loimer"] },
        { desc: "Wachau or Kremstal Grüner", askFor: "Ask for a Wachau or Kremstal Grüner, $22-38", min: 22, max: 38, producers: ["F.X. Pichler", "Hirtzberger", "Nikolaihof"] },
        { desc: "Premium Smaragd Grüner", askFor: "Ask for a Smaragd or Reserve Grüner Veltliner", min: 40, max: 70, producers: ["Knoll", "Prager", "Rudi Pichler"] }
      );
      await sql`
        INSERT INTO chapters (journey_id, chapter_number, title, description, wine_requirements, learning_objectives, tasting_prompts, completion_criteria, wine_options)
        VALUES (
          ${journey8.id},
          2,
          'Grüner Veltliner: Austria''s Pride',
          'Meet Austria''s signature white grape. Peppery, herbal, and incredibly food-friendly.',
          ${JSON.stringify({ region: "Austria", grapeVariety: "Grüner Veltliner" })},
          ${JSON.stringify([
            "Identify white pepper signature note",
            "Recognize green herb and citrus",
            "Understand Austrian wine classification"
          ])},
          ${JSON.stringify([
            { question: "Do you taste white pepper?", category: "taste" },
            { question: "What herbs or green notes are present?", category: "aroma" },
            { question: "How does the acidity compare to Riesling?", category: "structure" }
          ])},
          ${JSON.stringify({ requirePhoto: true })},
          ${JSON.stringify(grunerOptions)}
        )
        ON CONFLICT DO NOTHING
      `;

      // Chapter 3: Chenin Blanc
      const cheninOptions = createWineOptions(
        { desc: "South African Chenin Blanc under $15", askFor: "Ask for a South African Chenin Blanc under $15", min: 10, max: 15, producers: ["Ken Forrester", "Spier", "Mullineux"] },
        { desc: "Loire Vouvray or SA Premium", askFor: "Ask for a Vouvray or premium South African Chenin, $20-35", min: 20, max: 35, producers: ["Domaine Huet", "Champalou", "Raats"] },
        { desc: "Premium Loire Chenin", askFor: "Ask for a top Loire Chenin (Savennières, aged Vouvray)", min: 40, max: 70, producers: ["Nicolas Joly", "Domaine des Baumard", "François Chidaine"] }
      );
      await sql`
        INSERT INTO chapters (journey_id, chapter_number, title, description, wine_requirements, learning_objectives, tasting_prompts, completion_criteria, wine_options)
        VALUES (
          ${journey8.id},
          3,
          'Chenin Blanc: The Chameleon',
          'From bone-dry to honeyed dessert wines, Chenin Blanc does it all. Compare Loire elegance to South African value.',
          ${JSON.stringify({ grapeVariety: "Chenin Blanc" })},
          ${JSON.stringify([
            "Understand Chenin's range of styles",
            "Identify quince, apple, and honey notes",
            "Compare Loire vs South African styles"
          ])},
          ${JSON.stringify([
            { question: "What fruits do you taste?", category: "taste" },
            { question: "Is there any honey or lanolin?", category: "aroma" },
            { question: "Where do you think this is from?", category: "overall" }
          ])},
          ${JSON.stringify({ requirePhoto: true })},
          ${JSON.stringify(cheninOptions)}
        )
        ON CONFLICT DO NOTHING
      `;

      // Chapter 4: Albariño
      const albarinoOptions = createWineOptions(
        { desc: "Rías Baixas Albariño under $18", askFor: "Ask for a Rías Baixas Albariño under $18", min: 12, max: 18, producers: ["Martín Códax", "Burgáns", "Pazo de Señoráns"] },
        { desc: "Premium Rías Baixas", askFor: "Ask for a premium or single vineyard Albariño, $22-35", min: 22, max: 35, producers: ["Do Ferreiro", "Zárate", "Forjas del Salnés"] },
        { desc: "Top Producer Albariño", askFor: "Ask for a top producer aged or special cuvée Albariño", min: 38, max: 60, producers: ["Raúl Pérez (Sketch)", "Zárate (El Palomar)"] }
      );
      await sql`
        INSERT INTO chapters (journey_id, chapter_number, title, description, wine_requirements, learning_objectives, tasting_prompts, completion_criteria, wine_options)
        VALUES (
          ${journey8.id},
          4,
          'Albariño: Spain''s Coastal White',
          'Complete your white wine mastery with this Atlantic-influenced Spanish gem. Perfect with seafood.',
          ${JSON.stringify({ region: "Rías Baixas", grapeVariety: "Albariño" })},
          ${JSON.stringify([
            "Identify saline, mineral character",
            "Recognize stone fruit and citrus",
            "Appreciate the coastal influence"
          ])},
          ${JSON.stringify([
            { question: "Do you taste any salinity?", category: "taste" },
            { question: "What fruits come through?", category: "taste" },
            { question: "Would this pair well with seafood?", category: "overall" }
          ])},
          ${JSON.stringify({ requirePhoto: true })},
          ${JSON.stringify(albarinoOptions)}
        )
        ON CONFLICT DO NOTHING
      `;
    }

    // ========================================
    // Journey 9: Food & Wine Pairing Basics
    // ========================================
    const [journey9] = await sql`
      INSERT INTO journeys (title, description, difficulty_level, estimated_duration, wine_type, is_published, total_chapters)
      VALUES (
        'Food & Wine Pairing Basics',
        'Learn the practical art of matching wine with food. Four hands-on lessons with real pairings you can try at home.',
        'beginner',
        '4 wines',
        'mixed',
        true,
        4
      )
      ON CONFLICT DO NOTHING
      RETURNING id
    `;

    if (journey9?.id) {
      console.log("Created Journey 9 (Food & Wine Pairing Basics):", journey9.id);

      // Chapter 1: Match Weight with Weight
      const weightOptions = createWineOptions(
        { desc: "Light white or rosé", askFor: "Ask for a Pinot Grigio, Vinho Verde, or dry rosé under $15", min: 10, max: 15, producers: ["Santa Margherita", "Casal Garcia", "Whispering Angel"] },
        { desc: "Medium-bodied option", askFor: "Ask for a Chablis, unoaked Chardonnay, or Côtes du Rhône", min: 18, max: 30, producers: ["Louis Latour (Chablis)", "E. Guigal (CdR)"] }
      );
      await sql`
        INSERT INTO chapters (journey_id, chapter_number, title, description, wine_requirements, learning_objectives, tasting_prompts, completion_criteria, wine_options)
        VALUES (
          ${journey9.id},
          1,
          'Match Weight with Weight',
          'The first rule of pairing: match the body of wine to the richness of food. Light wines for light dishes, full wines for hearty meals.',
          ${JSON.stringify({ anyWine: true })},
          ${JSON.stringify([
            "Understand wine body/weight",
            "Learn to assess dish richness",
            "Practice matching principle"
          ])},
          ${JSON.stringify([
            { question: "How would you rate this wine's body? (light/medium/full)", category: "structure" },
            { question: "What light dish would pair well?", category: "overall" },
            { question: "What rich dish would pair well?", category: "overall" }
          ])},
          ${JSON.stringify({ requirePhoto: true })},
          ${JSON.stringify(weightOptions)}
        )
        ON CONFLICT DO NOTHING
      `;

      // Chapter 2: Acid Cuts Fat
      const acidOptions = createWineOptions(
        { desc: "High-acid white", askFor: "Ask for a Sancerre, Muscadet, or Cava under $20", min: 12, max: 20, producers: ["Henri Bourgeois", "Muscadet Sèvre et Maine", "Freixenet"] },
        { desc: "High-acid red", askFor: "Ask for a Chianti, Barbera, or Pinot Noir", min: 15, max: 30, producers: ["Antinori", "Michele Chiarlo (Barbera)", "La Crema"] }
      );
      await sql`
        INSERT INTO chapters (journey_id, chapter_number, title, description, wine_requirements, learning_objectives, tasting_prompts, completion_criteria, wine_options)
        VALUES (
          ${journey9.id},
          2,
          'Acid Cuts Through Fat',
          'High-acid wines are perfect partners for rich, fatty foods. Try this with cheese, fried foods, or creamy sauces.',
          ${JSON.stringify({ anyWine: true })},
          ${JSON.stringify([
            "Recognize high acidity in wine",
            "Understand why acid cuts fat",
            "Try the principle with real food"
          ])},
          ${JSON.stringify([
            { question: "How acidic is this wine?", category: "structure" },
            { question: "Try it with cheese - what happens?", category: "overall" },
            { question: "Does the wine taste different with food?", category: "taste" }
          ])},
          ${JSON.stringify({ requirePhoto: true })},
          ${JSON.stringify(acidOptions)}
        )
        ON CONFLICT DO NOTHING
      `;

      // Chapter 3: Tannins and Protein
      const tanninOptions = createWineOptions(
        { desc: "Tannic red wine", askFor: "Ask for a Cabernet Sauvignon, Malbec, or Barolo under $25", min: 15, max: 25, producers: ["Robert Mondavi", "Catena", "Pio Cesare (Langhe)"] },
        { desc: "Premium tannic red", askFor: "Ask for a Napa Cabernet or Barolo", min: 30, max: 55, producers: ["Caymus", "Silver Oak", "Fontanafredda"] }
      );
      await sql`
        INSERT INTO chapters (journey_id, chapter_number, title, description, wine_requirements, learning_objectives, tasting_prompts, completion_criteria, wine_options)
        VALUES (
          ${journey9.id},
          3,
          'Tannins Love Protein',
          'Tannic red wines and red meat are a classic pairing. Learn why protein softens tannins and makes both taste better.',
          ${JSON.stringify({ wineType: "red" })},
          ${JSON.stringify([
            "Feel tannins without food",
            "Notice how protein changes tannins",
            "Understand the chemical reaction"
          ])},
          ${JSON.stringify([
            { question: "How tannic is this wine alone?", category: "structure" },
            { question: "Try it with steak or cheese - how do the tannins change?", category: "overall" },
            { question: "Which protein worked best?", category: "overall" }
          ])},
          ${JSON.stringify({ requirePhoto: true })},
          ${JSON.stringify(tanninOptions)}
        )
        ON CONFLICT DO NOTHING
      `;

      // Chapter 4: Sweet with Spicy
      const sweetOptions = createWineOptions(
        { desc: "Off-dry wine", askFor: "Ask for an off-dry Riesling, Gewürztraminer, or Moscato under $18", min: 10, max: 18, producers: ["Dr. Loosen", "Hugel (Gentil)", "La Spinetta (Moscato d'Asti)"] },
        { desc: "Premium off-dry", askFor: "Ask for a Spätlese Riesling or Alsace Gewürztraminer", min: 20, max: 35, producers: ["Selbach-Oster", "Trimbach (Gewürz)"] }
      );
      await sql`
        INSERT INTO chapters (journey_id, chapter_number, title, description, wine_requirements, learning_objectives, tasting_prompts, completion_criteria, wine_options)
        VALUES (
          ${journey9.id},
          4,
          'Sweet Tames Spicy',
          'Complete your pairing education with the classic sweet-spicy combination. A touch of sweetness cools the heat.',
          ${JSON.stringify({ wineType: "white" })},
          ${JSON.stringify([
            "Understand residual sugar",
            "Learn why sweetness balances heat",
            "Try with spicy Asian cuisine"
          ])},
          ${JSON.stringify([
            { question: "Is this wine dry or off-dry?", category: "taste" },
            { question: "Try it with spicy food - what happens to the heat?", category: "overall" },
            { question: "Would a dry wine work as well?", category: "overall" }
          ])},
          ${JSON.stringify({ requirePhoto: true })},
          ${JSON.stringify(sweetOptions)}
        )
        ON CONFLICT DO NOTHING
      `;
    }

    console.log("All journeys with wine options seeded successfully!");
  } catch (error) {
    console.error("Error seeding journeys:", error);
  } finally {
    await sql.end();
  }
}

seedJourneys();
