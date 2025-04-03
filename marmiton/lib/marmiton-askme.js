import * as marmiton from './marmiton-lib.js';
import { afficheRecette } from '../marmiton.js';

let Locale;

async function askmeChercheRecette(data) {
   Locale = await Avatar.lang.getPak('marmiton', Config.language);
   const askmeKeys = { '*': 'generic', ...Config.modules.marmiton['search'][data.language] };

   return new Promise((resolve) => {
      Avatar.askme(Locale.get('askme.question'), data.client, askmeKeys, 15, async (answer, end) => {
         end(data.client);

         if (answer && answer.includes('generic')) {
            const searchTerm = answer.split(':')[1];
            const recettes = await marmiton.scrapeFullRecipes(searchTerm);
            await enonceRecettes(data, recettes);
            resolve(recettes);
         } else {
            switch (answer) {
               case 'done':
               default:
                  Avatar.speak(Locale.get('askme.quit'), data.client);
                  resolve(false);
            }
         }
      });
   });
}

async function askmeSelectRecipe(data, recettes) {
   const askmeKeys = { '*': 'generic', ...Config.modules.marmiton.askme['selectRecipe'][data.language] };
   return new Promise((resolve) => {
      Avatar.askme(Locale.get('askme.select'), data.client, askmeKeys, 15, async (answer, end) => {
         try {
            end(data.client);

            if (!answer) {
               return resolve(false);
            }

            if (answer.includes('generic')) {
               const numberWords = Config?.modules?.marmiton?.numberWords || {};
               const userInput = answer.split(':')[1]?.trim().toLowerCase();

               if (!userInput) {
                  Avatar.speak(Locale.get('askme.noselect'), data.client);
                  return resolve(false);
               }

               let selectionType = 'nom';
               let selectionValue = userInput;

               if (!isNaN(userInput)) {
                  selectionType = 'numero';
               } else if (numberWords[userInput]) {
                  selectionType = 'numero';
                  selectionValue = numberWords[userInput].toString();
               } else if (userInput.startsWith('la ') || userInput.startsWith('the ')) {
                  const cleanInput = userInput.substring(3);
                  if (numberWords[cleanInput]) {
                     selectionType = 'numero';
                     selectionValue = numberWords[cleanInput].toString();
                  }
               }

               const selection = await marmiton.selectRecipe({ type: selectionType, valeur: selectionValue }, recettes);
               const nbperson = await askmeNbPerson(data, recettes);

               return resolve({ selection, nbperson });
            }
         } catch (error) {
            Avatar.speak(Locale.get('askme.error'), data.client);
            resolve(false);
         }
      });
   });
}

async function askmeOpenWindowRecette(data, result) {
   const askmeKeys = {
      '*': 'invalid',
      ...Config.modules.marmiton.askme['openRecetteWindow'][data.language],
   };

   return new Promise((resolve) => {
      Avatar.askme(Locale.get('askme.questionOpenRecette'), data.client, askmeKeys, 15, async (answer, end) => {
         try {
            end(data.client);

            switch (answer) {
               case 'valid':
                  await afficheRecette(data, result);
                  return resolve(true);
               case 'infos':
                  await speakInfos(data, result);
                  return resolve(true);
               case 'select':
                  await enonceRecettes(data, result);
                  return resolve(true);
               case 'done':
                  Avatar.speak(Locale.get('askme.quit'), data.client);
                  return resolve(false);
               case 'invalid':
               default:
                  Avatar.speak(Locale.get('askme.error'), data.client);
                  return resolve(false);
            }
         } catch {
            return resolve(false);
         }
      });
   });
}

async function askmeNbPerson(data, recettes) {
   const askmeKeys = { '*': 'generic', ...Config.modules.marmiton.askme['nbPerson'][data.language] };
   return new Promise((resolve) => {
      Avatar.askme(Locale.get('askme.questionNbPerson'), data.client, askmeKeys, 15, async (answer, end) => {
         try {
            end(data.client);

            if (answer.includes('generic')) {
               const userInput = answer.split(':')[1];
               const match = userInput.match(/\d+/);

               if (match) {
                  const numberperson = parseInt(match[0], 10);

                  return resolve(numberperson);
               } else {
                  Avatar.speak(Locale.get('askme.noselect'), data.client);
                  return resolve(Config.modules.marmiton.settings.search.nbperson);
               }
            } else {
               switch (answer) {
                  case 'done':
                     Avatar.speak(Locale.get('askme.quit'), data.client);
                     return resolve(false);
                  case 'select':
                     await enonceRecettes(data, recettes);
                     return resolve(true);
                  case 'invalid':
                  default:
                     Avatar.speak(Locale.get('askme.error'), data.client);
                     return resolve(false);
               }
            }
         } catch {
            resolve(false);
         }
      });
   });
}

async function enonceRecettes(data, recettes) {
   return new Promise((resolve) => {
      let liste = '';
      const category = recettes[0]?.category || '';

      Promise.all(
         recettes.map(async (recette, i) => {
            const numero = i + 1;
            const msg = (await Locale.get(['tts.number', numero])) + '. ' + recette.title + '. ';
            return msg;
         })
      ).then(async (messages) => {
         liste = messages.join('');
         const msg1 = (await Locale.get(['tts.findRecipe', recettes.length, category])) + '. ';
         Avatar.speak(msg1 + liste, data.client, async () => {
            try {
               const result = await askmeSelectRecipe(data, recettes);
               const results = await marmiton.calculRecettesNbPerson(result.selection, result.nbperson);
               await askmeOpenWindowRecette(data, results);
               return resolve(results);
            } catch (err) {
               await Avatar.speak(await Locale.get('tts.error'), data.client);
               return resolve(false);
            }
         });
      });
   });
}

async function speakInfos(data, recettes) {
   const recette = recettes[0];
   const ttsInfos = await Locale.get(['tts.infosRecipe', recette.title, recette.prepTime, recette.cookTime, recette.totalTime, recette.rating]);
   const ttsInfosIngredients = await Locale.get(['tts.infosIngredients', recette.yield, recette.ingredients]);

   return new Promise((resolve) => {
      Avatar.speak(ttsInfos, data.client, false, () => {
         Avatar.speak(ttsInfosIngredients, data.client, false, async () => {
            const result = await askmeOpenWindowRecette(data, recettes);
            resolve(result);
         });
      });
   });
}

export { askmeChercheRecette };
