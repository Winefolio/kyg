import postgres from "postgres";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error("DATABASE_URL not set");
  process.exit(1);
}

const sql = postgres(connectionString, {
  ssl: false,
  max: 1,
  connect_timeout: 30
});

async function seedJourneys() {
  try {
    console.log("Seeding sample journeys...");

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
      await sql`
        INSERT INTO chapters (journey_id, chapter_number, title, description, wine_requirements, learning_objectives, tasting_prompts, completion_criteria)
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
          ${JSON.stringify({ requirePhoto: true, requireAllPrompts: false })}
        )
        ON CONFLICT DO NOTHING
      `;

      // Chapter 2: Burgundy
      await sql`
        INSERT INTO chapters (journey_id, chapter_number, title, description, wine_requirements, learning_objectives, tasting_prompts, completion_criteria)
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
          ${JSON.stringify({ requirePhoto: true, requireAllPrompts: false })}
        )
        ON CONFLICT DO NOTHING
      `;

      // Chapter 3: Loire Valley White
      await sql`
        INSERT INTO chapters (journey_id, chapter_number, title, description, wine_requirements, learning_objectives, tasting_prompts, completion_criteria)
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
          ${JSON.stringify({ requirePhoto: true, requireAllPrompts: false })}
        )
        ON CONFLICT DO NOTHING
      `;

      // Chapter 4: Champagne
      await sql`
        INSERT INTO chapters (journey_id, chapter_number, title, description, wine_requirements, learning_objectives, tasting_prompts, completion_criteria)
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
          ${JSON.stringify({ requirePhoto: true, requireAllPrompts: false })}
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
      await sql`
        INSERT INTO chapters (journey_id, chapter_number, title, description, wine_requirements, learning_objectives, tasting_prompts, completion_criteria)
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
          ${JSON.stringify({ requirePhoto: true })}
        )
        ON CONFLICT DO NOTHING
      `;

      // Chapter 2: Barolo
      await sql`
        INSERT INTO chapters (journey_id, chapter_number, title, description, wine_requirements, learning_objectives, tasting_prompts, completion_criteria)
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
          ${JSON.stringify({ requirePhoto: true })}
        )
        ON CONFLICT DO NOTHING
      `;

      // Chapter 3: Amarone
      await sql`
        INSERT INTO chapters (journey_id, chapter_number, title, description, wine_requirements, learning_objectives, tasting_prompts, completion_criteria)
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
          ${JSON.stringify({ requirePhoto: true })}
        )
        ON CONFLICT DO NOTHING
      `;

      // Chapter 4: Brunello
      await sql`
        INSERT INTO chapters (journey_id, chapter_number, title, description, wine_requirements, learning_objectives, tasting_prompts, completion_criteria)
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
          ${JSON.stringify({ requirePhoto: true })}
        )
        ON CONFLICT DO NOTHING
      `;

      // Chapter 5: Super Tuscan
      await sql`
        INSERT INTO chapters (journey_id, chapter_number, title, description, wine_requirements, learning_objectives, tasting_prompts, completion_criteria)
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
          ${JSON.stringify({ requirePhoto: true })}
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

    console.log("Sample journeys seeded successfully!");
  } catch (error) {
    console.error("Error seeding journeys:", error);
  } finally {
    await sql.end();
  }
}

seedJourneys();
