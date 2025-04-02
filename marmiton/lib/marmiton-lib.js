import axios from 'axios';
import * as cheerio from 'cheerio';

const URL_MARMITON = 'https://www.marmiton.org/recettes/recherche.aspx?type=all&aqt=';

async function scrapeRecipeList(keyword) {
   const { data } = await axios.get(`${URL_MARMITON}${encodeURIComponent(keyword)}`);
   const $ = cheerio.load(data);

   let itemList = null;

   $('script[type="application/ld+json"]').each((_, el) => {
      try {
         const parsed = JSON.parse($(el).html());
         if (parsed['@type'] === 'ItemList') {
            itemList = parsed;
         }
      } catch {
         return;
      }
   });

   if (!itemList) return;

   return itemList.itemListElement.map((item) => ({
      url: item.url,
      image: cleanImageUrl(item.image.pictureUrls.origin) || null,
      thumb: cleanImageUrl(item.image.pictureUrls.thumb) || null,
      position: item.position,
   }));
}

async function scrapeRecipePage(url) {
   const { data } = await axios.get(url);
   const $ = cheerio.load(data);

   let recipe = null;

   $('script[type="application/ld+json"]').each((_, el) => {
      try {
         const parsed = JSON.parse($(el).html());
         if (parsed['@type'] === 'Recipe') {
            recipe = parsed;
         }
      } catch {
         return;
      }
   });

   return recipe;
}

async function scrapeFullRecipes(keyword, servings) {
   const limit = Config.modules.marmiton.settings.search.limit;
   const list = await scrapeRecipeList(keyword);
   if (!servings) servings = 4; // nombre de personnes souhaité

   const results = [];

   for (let i = 0; i < Math.min(limit, list.length); i++) {
      const { url, image, position } = list[i];

      const recipe = await scrapeRecipePage(url);
      const yieldMatch = /(\d+(?:[\.,]\d+)?)\s*(.*)/.exec(recipe.recipeYield || '');

      const yieldNumber = yieldMatch ? parseFloat(yieldMatch[1].replace(',', '.')) : null;
      const yieldText = yieldMatch ? yieldMatch[2].trim() : null;

      if (!recipe) continue;
      // La partie adjust reste a voir, pose des probleme lors des calculs dans la windowRecette
      results.push({
         position,
         url,
         title: recipe.name,
         image: image || (Array.isArray(recipe.image) ? recipe.image[0] : recipe.image),
         yield: recipe.recipeYield,
         yieldNumber: yieldNumber,
         yieldText: yieldText,
         prepTime: formatDuration(recipe.prepTime),
         cookTime: formatDuration(recipe.cookTime),
         totalTime: formatDuration(recipe.totalTime),
         difficulty: recipe.keywords || null,
         ingredients: recipe.recipeIngredient,
         adjustedIngredients: adaptIngredients(recipe.recipeIngredient, recipe.recipeYield, servings),
         instructions: recipe.recipeInstructions?.map((s) => s.text),
         adjustedInstructions: adaptTextQuantities(
            recipe.recipeInstructions?.map((s) => s.text),
            recipe.recipeYield,
            servings
         ),
         rating: recipe.aggregateRating?.ratingValue,
         ratingCount: recipe.aggregateRating?.reviewCount,
      });
   }

   return results;
}

async function selectRecipe(selection, recettes) {
   let selected = null;

   if (selection.type === 'numero') {
      const numero = parseInt(selection.valeur, 10);
      selected = recettes.find((recette) => recette.position === numero);
   } else if (selection.type === 'nom') {
      const searchValue = selection.valeur.toLowerCase();
      const matches = recettes.filter((recette) => recette.title.toLowerCase().includes(searchValue));
      if (matches.length > 0) {
         selected = matches[0];
      }
   }

   if (!selected) return recettes;

   const otherRecipes = recettes.filter((recette) => recette !== selected);
   return [selected, ...otherRecipes];
}

function toFriendlyFraction(decimal) {
   const fractions = [
      { value: 0, label: '' },
      { value: 0.25, label: '¼' },
      { value: 0.33, label: '⅓' },
      { value: 0.5, label: '½' },
      { value: 0.66, label: '⅔' },
      { value: 0.75, label: '¾' },
      { value: 1, label: '' },
   ];

   const whole = Math.floor(decimal);
   const frac = decimal - whole;

   const nearest = fractions.reduce((prev, curr) => (Math.abs(curr.value - frac) < Math.abs(prev.value - frac) ? curr : prev));

   const result = `${whole > 0 ? whole : ''}${nearest.label}`;
   return result || '0';
}

function adaptIngredients(ingredients, originalYield, targetServings) {
   const originalMatch = parseInt(originalYield?.match(/\d+/)?.[0] || '1');
   const ratio = targetServings / originalMatch;

   return ingredients.map((line) => {
      return line.replace(/(\d+([.,]?\d+)?)(\s*(cl|g|kg|ml|L|cuillère[s]?|tranche[s]?|sachet[s]?|pincée[s]?|[a-z]+)?)/i, (match, num) => {
         const number = parseFloat(num.replace(',', '.'));
         const newQuantity = number * ratio;
         const friendly = toFriendlyFraction(newQuantity);
         return match.replace(num, friendly);
      });
   });
}

function adaptTextQuantities(texts, originalYield, targetServings) {
   const originalMatch = parseInt(originalYield?.match(/\d+/)?.[0] || '1');
   const ratio = targetServings / originalMatch;

   return texts.map((text) => {
      return text.replace(/(\d+([.,]?\d+)?)(\s*(cl|g|kg|ml|L|cuillère[s]?|tranche[s]?|sachet[s]?|pincée[s]?|[a-z]+)?)/gi, (match, num) => {
         const number = parseFloat(num.replace(',', '.'));
         const newQuantity = number * ratio;
         const friendly = toFriendlyFraction(newQuantity);
         return match.replace(num, friendly);
      });
   });
}

async function calculRecettesNbPerson(recettes, nbperson) {
   return recettes.map((recette) => {
      const ratio = nbperson / recette.yieldNumber;

      const ajusterQuantite = (texte) => {
         return texte.replace(/([\d.,]+)\s*(kg|g|cl|ml|cuill(?:[èe]re)?(?:s)?(?: à soupe| à café)?|tranches?|pinc(?:ée)?s?|reblochons?|gousses?)?/gi, (match, quantite, unite) => {
            if (!quantite) return match;
            let nombre = parseFloat(quantite.replace(',', '.'));
            if (isNaN(nombre)) return match;

            let ajust = nombre * ratio;
            // Pour des nombres lisibles : format fraction si besoin
            let arrondi = ajust < 1 && ajust !== 0 ? approxFraction(ajust) : ajust.toFixed(2).replace(/\.00$/, '');
            return `${arrondi}${unite ? ' ' + unite : ''}`;
         });
      };

      const approxFraction = (decimal) => {
         const fractions = [
            [1 / 8, '⅛'],
            [1 / 6, '⅙'],
            [1 / 5, '⅕'],
            [1 / 4, '¼'],
            [1 / 3, '⅓'],
            [3 / 8, '⅜'],
            [2 / 5, '⅖'],
            [1 / 2, '½'],
            [3 / 5, '⅗'],
            [5 / 8, '⅝'],
            [2 / 3, '⅔'],
            [3 / 4, '¾'],
            [4 / 5, '⅘'],
            [5 / 6, '⅚'],
            [7 / 8, '⅞'],
         ];
         for (const [val, frac] of fractions) {
            if (Math.abs(decimal - val) < 0.05) return frac;
         }
         return decimal.toFixed(2).replace(/\.00$/, '');
      };

      const adjustedIngredients = recette.ingredients.map(ajusterQuantite);

      return {
         ...recette,
         adjustedIngredients,
         adjustedYieldNumber: nbperson,
         adjustedYield: `${nbperson} ${recette.yieldText || 'personnes'}`,
      };
   });
}

function cleanImageUrl(url) {
   return url.replace(/(_origin)[^\.]*(\.\w{3,4})$/, '$1$2');
}

function formatDuration(iso) {
   const match = iso?.match(/PT(?:(\d+)H)?(?:(\d+)M)?/);
   if (!match) return null;
   const h = match[1] ? parseInt(match[1]) : 0;
   const m = match[2] ? parseInt(match[2]) : 0;
   return `${h ? `${h} h ` : ''}${m ? `${m} min` : ''}`.trim();
}

export { scrapeFullRecipes, selectRecipe, calculRecettesNbPerson };
