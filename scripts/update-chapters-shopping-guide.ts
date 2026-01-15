/**
 * Update existing chapters with shopping guide data
 */
import postgres from "postgres";

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL environment variable is required");
  }

  const sql = postgres(databaseUrl, { ssl: { rejectUnauthorized: false } });

  console.log("Updating chapters with shopping guide data...");

  try {
    // Journey 1: French Wine Essentials
    // Chapter 1: Bordeaux
    await sql`
      UPDATE chapters
      SET
        shopping_tips = 'Look for wines labeled "Bordeaux" or "Bordeaux Supérieur" for good value. Higher-end options include "Saint-Émilion" or "Médoc". The blend is typically Cabernet Sauvignon and Merlot.',
        price_range = ${JSON.stringify({ min: 15, max: 35, currency: "USD" })},
        alternatives = ${JSON.stringify([
          { name: "Any Cabernet-Merlot blend", criteria: { wineType: "red" } },
          { name: "Chilean Carmenère", criteria: { region: "Chile", wineType: "red" } },
          { name: "Washington State Bordeaux blend", criteria: { region: "Washington" } }
        ])},
        ask_for = 'I''m looking for a red Bordeaux, something in the $15-35 range. A Left Bank style if you have it.'
      WHERE title = 'The Elegance of Bordeaux'
    `;

    // Chapter 2: Burgundy
    await sql`
      UPDATE chapters
      SET
        shopping_tips = 'Burgundy Pinot Noir can be pricey. Look for "Bourgogne Rouge" for entry-level options. For more character, try villages like Côte de Beaune or Côte de Nuits.',
        price_range = ${JSON.stringify({ min: 20, max: 50, currency: "USD" })},
        alternatives = ${JSON.stringify([
          { name: "Oregon Pinot Noir", criteria: { region: "Oregon", grapeVariety: "Pinot Noir" } },
          { name: "New Zealand Pinot Noir", criteria: { region: "New Zealand", grapeVariety: "Pinot Noir" } },
          { name: "German Spätburgunder", criteria: { region: "Germany", grapeVariety: "Pinot Noir" } }
        ])},
        ask_for = 'I''d like a red Burgundy - a Bourgogne Rouge or something from Côte de Beaune. Around $25-40 would be great.'
      WHERE title = 'Burgundy: Land of Pinot Noir'
    `;

    // Chapter 3: Loire Valley
    await sql`
      UPDATE chapters
      SET
        shopping_tips = 'Sancerre and Pouilly-Fumé are the famous Loire Sauvignon Blancs, but Touraine or Quincy offer similar styles at lower prices. For Chenin Blanc, look for Vouvray.',
        price_range = ${JSON.stringify({ min: 12, max: 28, currency: "USD" })},
        alternatives = ${JSON.stringify([
          { name: "Sancerre", criteria: { region: "Loire Valley", grapeVariety: "Sauvignon Blanc" } },
          { name: "Pouilly-Fumé", criteria: { region: "Loire Valley" } },
          { name: "New Zealand Sauvignon Blanc", criteria: { region: "Marlborough" } }
        ])},
        ask_for = 'I''m looking for a crisp white from the Loire Valley - Sancerre, Pouilly-Fumé, or a good Touraine Sauvignon Blanc.'
      WHERE title = 'Loire Valley: Crisp Whites'
    `;

    // Chapter 4: Champagne
    await sql`
      UPDATE chapters
      SET
        shopping_tips = 'True Champagne only comes from the Champagne region. Look for "Brut" for dry styles. Grower Champagne (marked "RM") often offers better value than big houses.',
        price_range = ${JSON.stringify({ min: 35, max: 60, currency: "USD" })},
        alternatives = ${JSON.stringify([
          { name: "Crémant de Loire or Bourgogne", criteria: { wineType: "sparkling" } },
          { name: "English sparkling wine", criteria: { region: "England", wineType: "sparkling" } },
          { name: "Quality Cava Reserva", criteria: { region: "Spain", wineType: "sparkling" } }
        ])},
        ask_for = 'I''m looking for a Champagne in the $40-50 range. Do you have any grower Champagnes, or a nice Non-Vintage Brut?'
      WHERE title = 'Champagne: The Art of Bubbles'
    `;

    // Journey 2: Italian Wine Discovery
    // Chapter 1: Chianti
    await sql`
      UPDATE chapters
      SET
        shopping_tips = 'Look for "Chianti Classico" for the best quality - it''s from the historic heart of the region. "Riserva" means extra aging. Avoid basic "Chianti" without "Classico".',
        price_range = ${JSON.stringify({ min: 12, max: 25, currency: "USD" })},
        alternatives = ${JSON.stringify([
          { name: "Rosso di Montalcino", criteria: { region: "Tuscany", grapeVariety: "Sangiovese" } },
          { name: "Vino Nobile di Montepulciano", criteria: { region: "Tuscany" } },
          { name: "Morellino di Scansano", criteria: { region: "Tuscany" } }
        ])},
        ask_for = 'I''d like a Chianti Classico - something with good Sangiovese character. A Riserva would be nice if you have one under $25.'
      WHERE title LIKE 'Chianti%'
    `;

    // Chapter 2: Barolo
    await sql`
      UPDATE chapters
      SET
        shopping_tips = 'Barolo is expensive but worth it. For value, look for "Langhe Nebbiolo" which is the same grape but younger vines or declassified fruit. Barbaresco is Barolo''s slightly softer sibling.',
        price_range = ${JSON.stringify({ min: 35, max: 80, currency: "USD" })},
        alternatives = ${JSON.stringify([
          { name: "Langhe Nebbiolo", criteria: { region: "Piedmont", grapeVariety: "Nebbiolo" } },
          { name: "Barbaresco", criteria: { region: "Piedmont", grapeVariety: "Nebbiolo" } },
          { name: "Roero", criteria: { region: "Piedmont", grapeVariety: "Nebbiolo" } }
        ])},
        ask_for = 'I''m interested in trying Nebbiolo. Do you have a Barolo around $50, or maybe a Langhe Nebbiolo for something more approachable?'
      WHERE title LIKE 'Barolo%'
    `;

    // Chapter 3: Amarone
    await sql`
      UPDATE chapters
      SET
        shopping_tips = 'Amarone is a splurge wine - it''s made from dried grapes so production costs are high. For a taste of the style at lower cost, try "Ripasso" which uses Amarone grape skins.',
        price_range = ${JSON.stringify({ min: 40, max: 75, currency: "USD" })},
        alternatives = ${JSON.stringify([
          { name: "Valpolicella Ripasso", criteria: { region: "Veneto" } },
          { name: "Recioto della Valpolicella (sweet)", criteria: { region: "Veneto" } },
          { name: "Primitivo di Manduria", criteria: { region: "Puglia" } }
        ])},
        ask_for = 'I''m looking for an Amarone della Valpolicella. If that''s above my budget, do you have a good Ripasso?'
      WHERE title LIKE 'Amarone%'
    `;

    // Chapter 4: Brunello
    await sql`
      UPDATE chapters
      SET
        shopping_tips = 'Brunello requires 5 years aging before release, so it''s pricey. "Rosso di Montalcino" is the baby sibling - same grape, same area, less aging, lower price.',
        price_range = ${JSON.stringify({ min: 45, max: 90, currency: "USD" })},
        alternatives = ${JSON.stringify([
          { name: "Rosso di Montalcino", criteria: { region: "Tuscany", grapeVariety: "Sangiovese" } },
          { name: "Chianti Classico Riserva", criteria: { region: "Tuscany" } },
          { name: "Vino Nobile di Montepulciano", criteria: { region: "Tuscany" } }
        ])},
        ask_for = 'I''d like to try a Brunello di Montalcino. What do you have around $50-70? Or a really good Rosso di Montalcino as an alternative.'
      WHERE title = 'Brunello di Montalcino'
    `;

    // Chapter 5: Super Tuscan
    await sql`
      UPDATE chapters
      SET
        shopping_tips = 'Super Tuscans vary widely - some are Sangiovese-based, others use Cabernet or Merlot. Famous ones like Sassicaia or Tignanello are expensive. Look for "IGT Toscana" on the label.',
        price_range = ${JSON.stringify({ min: 20, max: 60, currency: "USD" })},
        alternatives = ${JSON.stringify([
          { name: "Bolgheri Rosso", criteria: { region: "Tuscany" } },
          { name: "Maremma Toscana", criteria: { region: "Tuscany" } },
          { name: "Any IGT Toscana blend", criteria: { region: "Tuscany", wineType: "red" } }
        ])},
        ask_for = 'I''m looking for a Super Tuscan - something that blends Italian and international grapes. What do you recommend in the $25-50 range?'
      WHERE title LIKE 'Super Tuscan%'
    `;

    // Journey 3: Wine Tasting Fundamentals (use any wine, so less specific guidance)
    await sql`
      UPDATE chapters
      SET
        shopping_tips = 'For this exercise, any wine will work! If you want to buy something specifically, grab a wine that''s clear (not natural/unfiltered) so you can properly assess clarity.',
        price_range = ${JSON.stringify({ min: 10, max: 20, currency: "USD" })},
        alternatives = ${JSON.stringify([
          { name: "Any clear, filtered wine", criteria: { wineType: "red" } },
          { name: "A rosé (great for seeing color)", criteria: { wineType: "rosé" } }
        ])},
        ask_for = 'I''m practicing wine tasting. Can you recommend an affordable wine that''s a good example of its type?'
      WHERE title = 'See: The Visual Assessment'
    `;

    await sql`
      UPDATE chapters
      SET
        shopping_tips = 'For aroma practice, choose a wine known for being aromatic. Sauvignon Blanc, Riesling, or Gewürztraminer for whites. Pinot Noir or Gamay for reds.',
        price_range = ${JSON.stringify({ min: 12, max: 25, currency: "USD" })},
        alternatives = ${JSON.stringify([
          { name: "Aromatic white (Riesling, Gewürztraminer)", criteria: { wineType: "white" } },
          { name: "Aromatic red (Pinot Noir, Gamay)", criteria: { wineType: "red" } }
        ])},
        ask_for = 'I''m learning to identify wine aromas. What''s a really aromatic wine I could practice with?'
      WHERE title = 'Smell: The Aromatic Journey'
    `;

    await sql`
      UPDATE chapters
      SET
        shopping_tips = 'For tasting practice, it helps to have wines with distinct characteristics. A tannic red like Cabernet, a high-acid white like Riesling, or try both side by side.',
        price_range = ${JSON.stringify({ min: 12, max: 25, currency: "USD" })},
        alternatives = ${JSON.stringify([
          { name: "Tannic red (Cabernet, Nebbiolo)", criteria: { wineType: "red" } },
          { name: "High-acid white (Riesling, Sauvignon Blanc)", criteria: { wineType: "white" } }
        ])},
        ask_for = 'I''m practicing identifying tannins and acidity. Can you recommend wines that really showcase those characteristics?'
      WHERE title = 'Taste: Putting It All Together'
    `;

    console.log("✅ Successfully updated chapters with shopping guide data");

    // Verify the updates
    const result = await sql`
      SELECT title, shopping_tips IS NOT NULL as has_tips, ask_for IS NOT NULL as has_askfor
      FROM chapters
      ORDER BY journey_id, chapter_number
    `;

    console.log("\nUpdated chapters:");
    for (const row of result) {
      console.log(`  ${row.has_tips ? '✓' : '✗'} ${row.title}`);
    }
  } catch (error) {
    console.error("Error:", error);
    throw error;
  } finally {
    await sql.end();
  }
}

main().catch(console.error);
